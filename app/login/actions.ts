"use server"

import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"

import { appUrl, supabaseConfigured } from "@/lib/env"
import { staffByEmail } from "@/lib/staff"
import { createAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { emailSchema, signInCodeSchema } from "@/lib/validation/settings"

function cooldownSeconds(message: string): number {
  const match = /after (\d+) seconds?/i.exec(message)
  return match ? Number(match[1]) : 0
}

function codeStep(email: string, error?: "code"): never {
  const target = `/login?code=1&email=${encodeURIComponent(email)}`
  redirect(error ? `${target}&error=${error}` : target)
}

async function invitedKind(email: string): Promise<"owner" | "client" | null> {
  const admin = createAdmin()
  const rpc = await admin.rpc("sign_in_kind", { target_email: email })
  if (!rpc.error && (rpc.data === "owner" || rpc.data === "client")) return rpc.data
  if (rpc.error && staffByEmail(email)) return "owner"
  if (rpc.error) {
    const { data: profile } = await admin.from("profiles").select("role, client_id").eq("email", email).maybeSingle()
    if (profile?.role === "owner") return "owner"
    if (profile?.role === "client" && profile.client_id) return "client"
  }
  return null
}

async function openSession(userId: string, email: string) {
  const person = staffByEmail(email)
  const admin = createAdmin()
  if (person) {
    await admin.from("profiles").upsert({
      id: userId,
      email,
      full_name: person.full_name,
      role: "owner",
      client_id: null,
    })
  }
  const { data: profile } = await admin.from("profiles").select("role, client_id").eq("id", userId).maybeSingle()
  if (profile?.role === "owner") redirect("/studio")
  if (profile?.role === "client" && profile.client_id) redirect("/portal")
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login?error=uninvited")
}

export async function signIn(formData: FormData) {
  const parsed = emailSchema.safeParse(String(formData.get("email") ?? ""))
  if (!parsed.success) redirect("/login?error=invalid")
  const email = parsed.data.toLowerCase()
  if (!supabaseConfigured()) redirect("/login?error=config")
  const kind = await invitedKind(email)
  if (!kind) redirect("/login?error=uninvited")

  const person = staffByEmail(email)
  const jar = await cookies()
  for (const cookie of jar.getAll()) {
    if (cookie.name.includes("code-verifier")) jar.set(cookie.name, "", { path: "/", maxAge: 0 })
  }
  const supabase = await createClient()
  const origin = (await headers()).get("origin") ?? appUrl()
  const options = {
    emailRedirectTo: `${origin}/auth/callback`,
    shouldCreateUser: kind === "owner",
    data: person ? { full_name: person.full_name } : undefined,
  }
  let { error } = await supabase.auth.signInWithOtp({ email, options })
  const pause = error ? cooldownSeconds(error.message) : 0
  if (error?.code === "over_email_send_rate_limit" && pause > 0 && pause <= 5) {
    await new Promise((resolve) => setTimeout(resolve, (pause + 1) * 1000))
    const retry = await supabase.auth.signInWithOtp({ email, options })
    error = retry.error
  }
  if (error?.code === "over_email_send_rate_limit" && cooldownSeconds(error.message) > 0) {
    codeStep(email)
  }
  if (error) redirect("/login?error=send")
  codeStep(email)
}

export async function verifyCode(formData: FormData) {
  const emailParsed = emailSchema.safeParse(String(formData.get("email") ?? ""))
  if (!emailParsed.success) redirect("/login?error=invalid")
  const email = emailParsed.data.toLowerCase()
  const codeParsed = signInCodeSchema.safeParse(String(formData.get("code") ?? ""))
  if (!codeParsed.success) codeStep(email, "code")
  if (!(await invitedKind(email))) redirect("/login?error=uninvited")

  const supabase = await createClient()
  const verified = await supabase.auth.verifyOtp({
    email,
    token: codeParsed.data,
    type: "email",
  })
  if (verified.error || !verified.data.user) codeStep(email, "code")
  await openSession(verified.data.user.id, email)
}

export async function signOut() {
  if (supabaseConfigured()) {
    const supabase = await createClient()
    await supabase.auth.signOut()
  }
  redirect("/login")
}
