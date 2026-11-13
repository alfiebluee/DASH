import { createBrowserClient } from "@supabase/ssr"

import { supabaseConfigured } from "@/lib/env"

export function createClient() {
  if (!supabaseConfigured()) {
    throw new Error("Supabase is not configured")
  }
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!)
}
