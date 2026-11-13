import { NextResponse } from "next/server"

import { browserOrigin } from "@/lib/origin"
import { staffByEmail } from "@/lib/staff"
import { createAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const otpTypes = ["signup", "invite", "magiclink", "recovery", "email_change", "email"] as const
type OtpType = (typeof otpTypes)[number]

function isOtpType(value: string | null): value is OtpType {
  return otpTypes.some((type) => type === value)
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const origin = browserOrigin(request)
  const code = url.searchParams.get("code")
  const tokenHash = url.searchParams.get("token_hash")
  const otpType = url.searchParams.get("type")
  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return NextResponse.redirect(new URL("/login?error=send", origin))
  } else if (tokenHash && isOtpType(otpType)) {
    const { error } = await supabase.auth.verifyOtp({ type: otpType, token_hash: tokenHash })
    if (error) return NextResponse.redirect(new URL("/login?error=send", origin))
  } else {
    return NextResponse.redirect(new URL("/login?error=send", origin))
  }

  const { data } = await supabase.auth.getUser()
  const email = data.user?.email?.toLowerCase()
  if (!data.user || !email) return NextResponse.redirect(new URL("/login?error=send", origin))

  const person = staffByEmail(email)
  if (person) {
    const admin = createAdmin()
    await admin.from("profiles").upsert({
      id: data.user.id,
      email,
      full_name: person.full_name,
      role: "owner",
      client_id: null,
    })
  }

  const { data: profile } = await supabase.from("profiles").select("role, client_id").eq("id", data.user.id).maybeSingle()
  if (profile?.role === "owner") return NextResponse.redirect(new URL("/studio", origin))
  if (profile?.role === "client" && profile.client_id) return NextResponse.redirect(new URL("/portal", origin))

  await supabase.auth.signOut()
  return NextResponse.redirect(new URL("/login?error=uninvited", origin))
}
