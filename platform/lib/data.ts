import { createClient } from "@/lib/supabase/server"
import { addDays, londonToday } from "@/lib/dates"
import {
  asNumber,
  toActivity,
  toBudgetLine,
  toBudgetSummary,
  toClient,
  toDocument,
  toMaterial,
  toOrder,
  toProject,
  type ActivityRecord,
  type AreaRecord,
  type BudgetLineRecord,
  type BudgetSummary,
  type ClientMaterial,
  type ClientRecord,
  type DeliveryWatch,
  type DocumentRecord,
  type MaterialRecord,
  type MaterialStatus,
  type OrderRecord,
  type ProjectCard,
  type SettingsRecord,
  type StaffRow,
  type SupplierRecord,
} from "@/lib/records"

function rows(data: unknown): unknown[] {
  return Array.isArray(data) ? data : []
}

export async function loadProjects(): Promise<ProjectCard[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, type, stage, status, due_date, start_date, pinned, description, client_id, contract_value, updated_at, clients(name)")
    .order("name")
  if (error) throw new Error(error.message)
  return rows(data).flatMap((row) => {
    const project = toProject(row)
    return project ? [project] : []
  })
}

export async function loadProject(id: string): Promise<ProjectCard | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, type, stage, status, due_date, start_date, pinned, description, client_id, contract_value, updated_at, clients(name)")
    .eq("id", id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return toProject(data)
}

export async function loadClients(): Promise<ClientRecord[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, company, email, phone, archived_at")
    .order("name")
  if (error) throw new Error(error.message)
  return rows(data).flatMap((row) => {
    const client = toClient(row)
    return client ? [client] : []
  })
}

export async function loadClient(id: string): Promise<ClientRecord | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, company, email, phone, archived_at")
    .eq("id", id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return toClient(data)
}

export async function loadSettings(): Promise<SettingsRecord> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("settings")
    .select("business_name, business_email, deposit_percent, away_from, away_until")
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {}
  const deposit = Number(record.deposit_percent)
  return {
    business_name: typeof record.business_name === "string" ? record.business_name : "Studio",
    business_email: typeof record.business_email === "string" ? record.business_email : "",
    deposit_percent: Number.isFinite(deposit) ? deposit : 50,
    away_from: typeof record.away_from === "string" ? record.away_from : null,
    away_until: typeof record.away_until === "string" ? record.away_until : null,
  }
}

export async function loadStaff(): Promise<StaffRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("list_staff")
  if (error) throw new Error(error.message)
  return rows(data).flatMap((row) => {
    if (!row || typeof row !== "object") return []
    const record = row as Record<string, unknown>
    if (typeof record.email !== "string" || typeof record.full_name !== "string") return []
    return [{
      email: record.email,
      full_name: record.full_name,
      job_title: typeof record.job_title === "string" ? record.job_title : "",
    }]
  })
}

function numberField(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function loadSuppliers(): Promise<SupplierRecord[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("suppliers").select("id, name, website, default_lead_days").order("name")
  if (error) throw new Error(error.message)
  return rows(data).flatMap((row) => {
    if (!row || typeof row !== "object") return []
    const record = row as Record<string, unknown>
    if (typeof record.id !== "string" || typeof record.name !== "string") return []
    return [{
      id: record.id,
      name: record.name,
      website: typeof record.website === "string" ? record.website : "",
      default_lead_days: numberField(record.default_lead_days),
    }]
  })
}

export async function loadAreas(projectId: string): Promise<AreaRecord[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("areas")
    .select("id, project_id, name, sort_order")
    .eq("project_id", projectId)
    .order("sort_order")
  if (error) throw new Error(error.message)
  return rows(data).flatMap((row) => {
    if (!row || typeof row !== "object") return []
    const record = row as Record<string, unknown>
    if (typeof record.id !== "string" || typeof record.name !== "string" || typeof record.project_id !== "string") return []
    return [{ id: record.id, project_id: record.project_id, name: record.name, sort_order: numberField(record.sort_order) }]
  })
}

const materialColumns = "id, project_id, area_id, supplier_id, order_id, item, spec, quantity, unit_cost, line_total, actual_cost, link, notes, priority, lead_days, status, ordered_at, expected_at, delivered_at, sort_order"

export async function loadMaterials(projectId: string): Promise<MaterialRecord[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("materials").select(materialColumns).eq("project_id", projectId).order("sort_order")
  if (error) throw new Error(error.message)
  return rows(data).flatMap((row) => {
    const material = toMaterial(row)
    return material ? [material] : []
  })
}

export async function loadOrders(projectId: string): Promise<OrderRecord[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("orders")
    .select("id, project_id, supplier_id, reference, items_total, vat, vat_included, delivery_cost, total, paid_with, status, ordered_at, expected_at, delivered_at, suppliers(name)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return rows(data).flatMap((row) => {
    const order = toOrder(row)
    return order ? [order] : []
  })
}

export async function loadBudgetLines(projectId: string): Promise<BudgetLineRecord[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("budget_lines")
    .select("id, project_id, label, kind, amount, sort_order")
    .eq("project_id", projectId)
    .order("sort_order")
  if (error) throw new Error(error.message)
  return rows(data).flatMap((row) => {
    const line = toBudgetLine(row)
    return line ? [line] : []
  })
}

export async function loadBudgetSummary(projectId: string): Promise<BudgetSummary | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("project_budget").select("*").eq("project_id", projectId).maybeSingle()
  if (error) throw new Error(error.message)
  return toBudgetSummary(data)
}

export async function loadClientMaterials(projectId: string): Promise<ClientMaterial[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("get_client_materials", { target_project: projectId })
  if (error) throw new Error(error.message)
  return rows(data).flatMap((row) => {
    if (!row || typeof row !== "object") return []
    const record = row as Record<string, unknown>
    if (typeof record.item !== "string") return []
    const status = record.status
    const known: MaterialStatus[] = ["to_order", "ordered", "delivered", "late", "cancelled"]
    const safe = known.find((item) => item === status) ?? "to_order"
    return [{
      area: typeof record.area === "string" ? record.area : "",
      item: record.item,
      quantity: asNumber(record.quantity),
      status: safe,
      expected_at: typeof record.expected_at === "string" ? record.expected_at : null,
      delivered_at: typeof record.delivered_at === "string" ? record.delivered_at : null,
    }]
  })
}

export async function loadDeliveryWatch(): Promise<{ late: DeliveryWatch[]; due: DeliveryWatch[] }> {
  const supabase = await createClient()
  const today = londonToday()
  const until = addDays(today, 6)
  const { data, error } = await supabase
    .from("materials")
    .select("id, item, status, expected_at, project_id, projects(name)")
    .in("status", ["ordered", "late"])
    .not("expected_at", "is", null)
  if (error) throw new Error(error.message)
  const late: DeliveryWatch[] = []
  const due: DeliveryWatch[] = []
  for (const row of rows(data)) {
    if (!row || typeof row !== "object") continue
    const record = row as Record<string, unknown>
    if (typeof record.id !== "string" || typeof record.item !== "string" || typeof record.project_id !== "string") continue
    if (typeof record.expected_at !== "string") continue
    const status: MaterialStatus = record.status === "late" ? "late" : "ordered"
    const project = Array.isArray(record.projects) ? record.projects[0] : record.projects
    const projectName = project && typeof project === "object" && "name" in project && typeof project.name === "string" ? project.name : "Project"
    const item: DeliveryWatch = { id: record.id, item: record.item, project_id: record.project_id, project_name: projectName, expected_at: record.expected_at, status }
    if (status === "late" || record.expected_at < today) late.push(item)
    else if (record.expected_at <= until) due.push(item)
  }
  late.sort((a, b) => a.expected_at.localeCompare(b.expected_at))
  due.sort((a, b) => a.expected_at.localeCompare(b.expected_at))
  return { late, due }
}

export async function loadDocuments(projectId: string): Promise<DocumentRecord[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("documents")
    .select("id, project_id, kind, title, version, file_path, status, sent_at")
    .eq("project_id", projectId)
    .order("kind")
    .order("title")
    .order("version", { ascending: false })
  if (error) throw new Error(error.message)
  return rows(data).flatMap((row) => {
    const document = toDocument(row)
    return document ? [document] : []
  })
}

export async function loadActivity(projectId: string): Promise<ActivityRecord[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("activity_log")
    .select("id, message, metadata, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return rows(data).flatMap((row) => {
    const entry = toActivity(row)
    return entry ? [entry] : []
  })
}
