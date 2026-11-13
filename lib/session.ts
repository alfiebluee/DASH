import { supabaseConfigured } from "@/lib/env"
import type { Role } from "@/lib/routing"
import { staffByEmail } from "@/lib/staff"
import { createClient } from "@/lib/supabase/server"

export type Session = {
  id: string
  email: string
  role: Role
  name: string
}

export async function getSession(): Promise<Session | null> {
  if (!supabaseConfigured()) return null
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, role, full_name, client_id")
    .eq("id", data.user.id)
    .maybeSingle()

  if (!profile || (profile.role !== "owner" && profile.role !== "viewer" && profile.role !== "client")) return null
  if (profile.role === "client" && !profile.client_id) return null

  const email = (profile.email || data.user.email || "").toLowerCase()
  const known = staffByEmail(email)
  return {
    id: data.user.id,
    email,
    role: profile.role,
    name: profile.full_name || known?.full_name || email,
  }
}
