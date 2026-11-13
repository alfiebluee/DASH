"use server"

import { revalidatePath } from "next/cache"
import { createClient as createSupabase } from "@supabase/supabase-js"

import { failed, type ActionResult } from "@/lib/action-result"
import { appUrl } from "@/lib/env"
import { ownerGuard, refreshSurfaces, saved } from "@/lib/mutate"
import { staffByEmail } from "@/lib/staff"
import { createAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { clientFormSchema } from "@/lib/validation/records"
import { emailSchema } from "@/lib/validation/settings"

function clientFields(formData: FormData) {
  return clientFormSchema.safeParse({
    name: formData.get("name"),
    company: formData.get("company") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
  })
}

export async function addClient(formData: FormData): Promise<ActionResult> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return guard
  const parsed = clientFields(formData)
  if (!parsed.success) return failed(parsed.error.issues[0]?.message ?? "Check the client.")
  const supabase = await createClient()
  const { error } = await supabase.from("clients").insert({
    name: parsed.data.name,
    company: parsed.data.company,
    email: parsed.data.email || null,
    phone: parsed.data.phone,
  })
  if (error) return failed("The client could not be created. That email may already be used.")
  refreshSurfaces()
  return saved("Client created.")
}

export async function saveClient(clientId: string, formData: FormData): Promise<ActionResult> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return guard
  const parsed = clientFields(formData)
  if (!parsed.success) return failed(parsed.error.issues[0]?.message ?? "Check the client.")
  const supabase = await createClient()
  const { error } = await supabase
    .from("clients")
    .update({
      name: parsed.data.name,
      company: parsed.data.company,
      email: parsed.data.email || null,
      phone: parsed.data.phone,
    })
    .eq("id", clientId)
  if (error) return failed("The client could not be saved.")
  refreshSurfaces()
  revalidateClient(clientId)
  return saved("Client saved.")
}

export async function setClientArchived(clientId: string, archived: boolean): Promise<ActionResult> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return guard
  const supabase = await createClient()
  const { error } = await supabase
    .from("clients")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", clientId)
  if (error) return failed("The client could not be updated.")
  refreshSurfaces()
  revalidateClient(clientId)
  return saved(archived ? "Client archived." : "Client restored.")
}

export async function inviteClient(clientId: string, formData: FormData): Promise<ActionResult> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return guard
  const parsed = emailSchema.safeParse(String(formData.get("email") ?? ""))
  if (!parsed.success) return failed("Enter a valid email.")
  const email = parsed.data.toLowerCase()
  if (staffByEmail(email)) return failed("That person already has access to the studio.")

  const supabase = await createClient()
  const { data: client } = await supabase.from("clients").select("id, name").eq("id", clientId).maybeSingle()
  if (!client) return failed("Client not found.")
  const { error: emailError } = await supabase.from("clients").update({ email }).eq("id", clientId)
  if (emailError) return failed("That email is already used by another client.")

  const origin = appUrl()
  const admin = createAdmin()
  const invited = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/callback`,
    data: { client_id: clientId, full_name: client.name },
  })
  if (!invited.error) {
    refreshSurfaces()
    revalidateClient(clientId)
    return saved("Invite sent.")
  }

  const { data: profile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle()
  if (!profile) return failed(invited.error.message || "The invite could not be sent.")
  const linked = await admin.from("profiles").update({ role: "client", client_id: clientId, full_name: client.name }).eq("id", profile.id)
  if (linked.error) return failed("The client profile could not be updated.")

  const mailer = createSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error: otpError } = await mailer.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback`, shouldCreateUser: false },
  })
  if (otpError) return failed(otpError.message || "The sign-in code could not be sent.")
  refreshSurfaces()
  revalidateClient(clientId)
  return saved("Sign-in code sent.")
}

function revalidateClient(clientId: string) {
  revalidatePath(`/studio/clients/${clientId}`)
}
