import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js"
import type { Page } from "@playwright/test"

export function localEnv(name: string): string {
  if (process.env[name]) return process.env[name]
  const file = readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
  const line = file.split("\n").find((entry) => entry.startsWith(`${name}=`))
  const value = line?.slice(name.length + 1).trim()
  if (!value) throw new Error(`${name} is missing from .env.local`)
  return value
}

export function adminClient(): SupabaseClient {
  return createClient(localEnv("NEXT_PUBLIC_SUPABASE_URL"), localEnv("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function createChunks(key: string, value: string): Array<{ name: string; value: string }> {
  const chunkSize = 3180
  let encoded = encodeURIComponent(value)
  if (encoded.length <= chunkSize) return [{ name: key, value }]
  const parts: string[] = []
  while (encoded.length > 0) {
    let head = encoded.slice(0, chunkSize)
    const lastEscape = head.lastIndexOf("%")
    if (lastEscape > chunkSize - 3) head = head.slice(0, lastEscape)
    while (head.length > 0) {
      try {
        parts.push(decodeURIComponent(head))
        break
      } catch {
        head = head.slice(0, -3)
      }
    }
    encoded = encoded.slice(head.length)
  }
  return parts.map((part, index) => ({ name: `${key}.${index}`, value: part }))
}

export async function installSession(page: Page, session: Session) {
  const ref = new URL(localEnv("NEXT_PUBLIC_SUPABASE_URL")).hostname.split(".")[0]
  const encoded = `base64-${Buffer.from(JSON.stringify(session), "utf8").toString("base64url")}`
  const chunks = createChunks(`sb-${ref}-auth-token`, encoded)
  await page.goto("/login")
  await page.evaluate((cookies) => {
    for (const cookie of cookies) {
      document.cookie = `${cookie.name}=${encodeURIComponent(cookie.value)}; Path=/; SameSite=Lax; Max-Age=40000000`
    }
  }, chunks)
}

export async function signIn(page: Page, email: string, metadata?: { client_id: string; full_name: string }) {
  const admin = adminClient()
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: metadata ?? { full_name: "Test user" },
  })
  if (created.error && !/already been registered/i.test(created.error.message)) throw created.error
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email })
  if (link.error || !link.data.properties?.hashed_token) throw link.error ?? new Error("No magic link")
  const client = createClient(localEnv("NEXT_PUBLIC_SUPABASE_URL"), localEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const verified = await client.auth.verifyOtp({ token_hash: link.data.properties.hashed_token, type: "email" })
  if (verified.error || !verified.data.session) throw verified.error ?? new Error("No session")
  await installSession(page, verified.data.session)
  return created.data.user?.id ?? verified.data.session.user.id
}
