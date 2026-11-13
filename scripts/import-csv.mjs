import { readFileSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"

const file = process.argv[2]
const apply = process.argv.includes("--apply")
if (!file) {
  console.error("Usage: node scripts/import-csv.mjs supabase/imports/studio.csv [--apply]")
  process.exit(1)
}

const text = readFileSync(file, "utf8").replace(/^\uFEFF/, "")
const [headerLine, ...lines] = text.split(/\r?\n/).filter((line) => line.trim())
const headers = headerLine.split(",").map((header) => header.trim())
const required = ["client_name", "project_name", "project_stage", "project_status"]
for (const column of required) {
  if (!headers.includes(column)) {
    console.error(`Missing column ${column}`)
    process.exit(1)
  }
}

const stages = new Set(["pipeline", "brief", "design", "build", "review", "live"])
const statuses = new Set(["active", "ongoing", "on_hold", "archived"])
const rows = lines.map((line) => {
  const cells = line.split(",")
  return Object.fromEntries(headers.map((header, index) => [header, (cells[index] ?? "").trim()]))
}).filter((row) => row.client_name)

if (rows.length === 0) {
  console.log("No data rows.")
  process.exit(0)
}

for (const row of rows) {
  if (row.project_name && !stages.has(row.project_stage)) {
    console.error(`Bad stage for ${row.project_name}`)
    process.exit(1)
  }
  if (row.project_name && !statuses.has(row.project_status)) {
    console.error(`Bad status for ${row.project_name}`)
    process.exit(1)
  }
  console.log(`${row.client_name}${row.project_name ? ` / ${row.project_name}` : ""}`)
}

if (!apply) {
  console.log(`${rows.length} row(s). Re-run with --apply to write them.`)
  process.exit(0)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SECRET_KEY
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.")
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })
const clients = new Map()
for (const row of rows) {
  let clientId = clients.get(row.client_name.toLowerCase())
  if (!clientId) {
    const existing = await supabase.from("clients").select("id").eq("name", row.client_name).maybeSingle()
    if (existing.error) throw existing.error
    clientId = existing.data?.id
    if (!clientId) {
      const created = await supabase.from("clients").insert({
        name: row.client_name,
        company: row.client_company || "",
        email: row.client_email?.toLowerCase() || null,
        phone: row.client_phone || "",
      }).select("id").single()
      if (created.error) throw created.error
      clientId = created.data.id
    }
    clients.set(row.client_name.toLowerCase(), clientId)
  }
  if (!row.project_name) continue
  const created = await supabase.from("projects").insert({
    client_id: clientId,
    name: row.project_name,
    type: row.project_type || "",
    stage: row.project_stage,
    status: row.project_status,
    start_date: row.start_date || null,
    due_date: row.due_date || null,
    description: row.description || "",
  })
  if (created.error) throw created.error
}

console.log("Imported.")
