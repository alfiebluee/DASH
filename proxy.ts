import { type NextRequest, NextResponse } from "next/server"

import { supabaseConfigured } from "@/lib/env"
import { browserOrigin } from "@/lib/origin"
import { redirectFor, type Role } from "@/lib/routing"
import { createProxyClient } from "@/lib/supabase/proxy"

async function roleFor(
  supabase: ReturnType<typeof createProxyClient>["supabase"],
): Promise<Role | null> {
  if (!supabaseConfigured() || !supabase) return null
  const { data } = await supabase.auth.getUser()
  if (!data.user) return null
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, client_id")
    .eq("id", data.user.id)
    .maybeSingle()
  if (profile?.role === "owner") return "owner"
  if (profile?.role === "viewer") return "viewer"
  if (profile?.role === "client" && profile.client_id) return "client"
  return null
}

export async function proxy(request: NextRequest) {
  const client = createProxyClient(request)
  const role = await roleFor(client.supabase)
  const destination = redirectFor(request.nextUrl.pathname, role)
  if (!destination) return client.response

  const redirect = NextResponse.redirect(new URL(destination, browserOrigin(request)))
  client.response.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie)
  })
  return redirect
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
