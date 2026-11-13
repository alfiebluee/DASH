import { createClient } from "@supabase/supabase-js"

import { supabaseConfigured } from "@/lib/env"

export function createAdmin() {
  if (!supabaseConfigured()) {
    throw new Error("Supabase is not configured")
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
