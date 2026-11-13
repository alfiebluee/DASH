"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { appUrl, supabaseConfigured } from "@/lib/env"
import { staffByEmail } from "@/lib/staff"
import { createAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { emailSchema } from "@/lib/validation/settings"

function localOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname
    return host === "localhost" || host === "127.0.0.1" || host === "::1"
  } catch {
    return false
  }
}

async function establishSession(email: string): Promise<boolean> {
  const admin = createAdmin()
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email })
  const tokenHash = link.data.properties?.hashed_token
  if (link.error || !tokenHash) return false
  const supabase = await createClient()
  const verified = await supabase.auth.verifyOtp({ type: "email", token_hash: tokenHash })
  if (verified.error || !verified.data.user) return false
  const person = staffByEmail(email)
  if (person) {
    await admin.from("profiles").upsert({
      id: verified.data.user.id,
      email,
      full_name: person.full_name,
      role: "owner",
      client_id: null,
    })
  }
  return true
}

export async function signIn(formData: FormData) {
  const parsed = emailSchema.safeParse(String(formData.get("email") ?? ""))
  if (!parsed.success) redirect("/login?error=invalid")
  const email = parsed.data.toLowerCase()
  if (!supabaseConfigured()) redirect("/login?error=config")

  const admin = createAdmin()
  const rpc = await admin.rpc("sign_in_kind", { target_email: email })
  let kind: "owner" | "client" | null = null
  if (!rpc.error && (rpc.data === "owner" || rpc.data === "client")) {
    kind = rpc.data
  } else if (rpc.error && staffByEmail(email)) {
    kind = "owner"
  } else if (rpc.error) {
    const { data: profile } = await admin.from("profiles").select("role, client_id").eq("email", email).maybeSingle()
    if (profile?.role === "owner") kind = "owner"
    else if (profile?.role === "client" && profile.client_id) kind = "client"
  }
  if (!kind) redirect("/login?error=uninvited")

  const person = staffByEmail(email)
  const supabase = await createClient()
  const origin = (await headers()).get("origin") ?? appUrl()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      shouldCreateUser: kind === "owner",
      data: person ? { full_name: person.full_name } : undefined,
    },
  })
  if (error) {
    if (error.code === "over_email_send_rate_limit" && localOrigin(origin)) {
      const signedIn = await establishSession(email)
      if (signedIn) redirect(kind === "owner" ? "/studio" : "/portal")
      redirect("/login?error=rate")
    }
    redirect(error.code === "over_email_send_rate_limit" ? "/login?error=rate" : "/login?error=send")
  }
  redirect("/login?sent=1")
}

export async function signOut() {
  if (supabaseConfigured()) {
    const supabase = await createClient()
    await supabase.auth.signOut()
  }
  redirect("/login")
}
