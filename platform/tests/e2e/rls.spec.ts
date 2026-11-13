import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { expect, test } from "@playwright/test"

const ringClient = "11111111-1111-4111-8111-111111111111"
const sharkClient = "22222222-2222-4222-8222-222222222222"

function localEnv(name: string): string {
  if (process.env[name]) return process.env[name]
  const file = readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
  const line = file.split("\n").find((entry) => entry.startsWith(`${name}=`))
  const value = line?.slice(name.length + 1).trim()
  if (!value) throw new Error(`${name} is missing from .env.local`)
  return value
}

async function clientSession(url: string, publishableKey: string, admin: SupabaseClient, email: string, clientId: string) {
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { client_id: clientId, full_name: email },
  })
  if (created.error && !/already been registered/i.test(created.error.message)) throw created.error

  const link = await admin.auth.admin.generateLink({ type: "magiclink", email })
  if (link.error || !link.data.properties?.hashed_token) throw link.error ?? new Error(`No magic link for ${email}`)

  const client = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const verified = await client.auth.verifyOtp({
    token_hash: link.data.properties.hashed_token,
    type: "email",
  })
  if (verified.error) throw verified.error
  return client
}

test("client A cannot read client B's projects", async () => {
  const url = localEnv("NEXT_PUBLIC_SUPABASE_URL")
  const publishableKey = localEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
  const secretKey = localEnv("SUPABASE_SECRET_KEY")
  const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })

  const ring = await clientSession(url, publishableKey, admin, "ring.portal@studio.test", ringClient)
  const shark = await clientSession(url, publishableKey, admin, "shark.portal@studio.test", sharkClient)

  const ringProjects = await ring.from("projects").select("name")
  expect(ringProjects.error).toBeNull()
  expect(ringProjects.data?.map((row) => row.name).sort()).toEqual(["Ring"])

  const sharkProjects = await shark.from("projects").select("name")
  expect(sharkProjects.error).toBeNull()
  expect(sharkProjects.data?.map((row) => row.name).sort()).toEqual(["Shark Beauty", "Shark Home", "Shark Ninja"])
})
