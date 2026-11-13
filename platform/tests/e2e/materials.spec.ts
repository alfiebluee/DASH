import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { createClient } from "@supabase/supabase-js"
import { expect, test } from "@playwright/test"

const ringProject = "33333333-3333-4333-8333-333333333333"

function localEnv(name: string): string {
  if (process.env[name]) return process.env[name]
  const file = readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
  const line = file.split("\n").find((entry) => entry.startsWith(`${name}=`))
  const value = line?.slice(name.length + 1).trim()
  if (!value) throw new Error(`${name} is missing from .env.local`)
  return value
}

test("marking an item ordered fills the expected date from the supplier lead time", async () => {
  const url = localEnv("NEXT_PUBLIC_SUPABASE_URL")
  const publishableKey = localEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
  const secretKey = localEnv("SUPABASE_SECRET_KEY")
  const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const email = "alfiebluee@gmail.com"
  await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { full_name: "Test user" } })
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email })
  if (link.error || !link.data.properties?.hashed_token) throw link.error ?? new Error("No magic link")
  const owner = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const verified = await owner.auth.verifyOtp({ token_hash: link.data.properties.hashed_token, type: "email" })
  if (verified.error) throw verified.error

  const supplier = await owner.from("suppliers").insert({ name: `Lead check ${Date.now()}`, default_lead_days: 5 }).select("id").single()
  expect(supplier.error).toBeNull()
  const material = await owner
    .from("materials")
    .insert({ project_id: ringProject, item: "CLS timber", quantity: 2, unit_cost: 3.5, supplier_id: supplier.data?.id })
    .select("id")
    .single()
  expect(material.error).toBeNull()
  const ordered = await owner.from("materials").update({ status: "ordered" }).eq("id", material.data?.id ?? "").select("ordered_at, expected_at, line_total").single()
  expect(ordered.error).toBeNull()
  expect(ordered.data?.ordered_at).toBeTruthy()
  expect(ordered.data?.line_total).toBe(7)
  const orderedOn = new Date(`${ordered.data?.ordered_at}T00:00:00Z`)
  orderedOn.setUTCDate(orderedOn.getUTCDate() + 5)
  expect(ordered.data?.expected_at).toBe(orderedOn.toISOString().slice(0, 10))

  await admin.from("materials").delete().eq("id", material.data?.id ?? "")
  await admin.from("suppliers").delete().eq("id", supplier.data?.id ?? "")
})
