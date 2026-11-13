import { createServerClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

import { supabaseConfigured } from "@/lib/env"

export function createProxyClient(request: NextRequest): {
  supabase: SupabaseClient | null
  response: NextResponse
} {
  const holder = { response: NextResponse.next({ request }) }
  if (!supabaseConfigured()) return { supabase: null, get response() { return holder.response } }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          holder.response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            holder.response.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  return { supabase, get response() { return holder.response } }
}
