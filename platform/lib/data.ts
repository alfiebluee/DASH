import { createClient } from "@/lib/supabase/server"
import {
  toActivity,
  toClient,
  toDocument,
  toProject,
  type ActivityRecord,
  type AreaRecord,
  type ClientRecord,
  type DocumentRecord,
  type MaterialRecord,
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
    .select("id, name, type, stage, status, due_date, start_date, pinned, description, client_id, updated_at, clients(name)")
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
    .select("id, name, type, stage, status, due_date, start_date, pinned, description, client_id, updated_at, clients(name)")
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

export async function loadMaterials(projectId: string): Promise<MaterialRecord[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("materials")
    .select("id, project_id, area_id, supplier_id, item, spec, quantity, unit_cost, line_total, link, notes, priority, lead_days, status, ordered_at, expected_at, delivered_at")
    .eq("project_id", projectId)
    .order("sort_order")
  if (error) throw new Error(error.message)
  return rows(data).flatMap((row) => {
    if (!row || typeof row !== "object") return []
    const record = row as Record<string, unknown>
    if (typeof record.id !== "string" || typeof record.item !== "string" || typeof record.project_id !== "string") return []
    const priority = record.priority === "high" ? "high" : "normal"
    const status = record.status
    const known = status === "to_order" || status === "ordered" || status === "delivered" || status === "late" || status === "cancelled"
    return [{
      id: record.id,
      project_id: record.project_id,
      area_id: typeof record.area_id === "string" ? record.area_id : null,
      supplier_id: typeof record.supplier_id === "string" ? record.supplier_id : null,
      item: record.item,
      spec: typeof record.spec === "string" ? record.spec : "",
      quantity: numberField(record.quantity),
      unit_cost: numberField(record.unit_cost),
      line_total: numberField(record.line_total),
      link: typeof record.link === "string" ? record.link : "",
      notes: typeof record.notes === "string" ? record.notes : "",
      priority,
      lead_days: record.lead_days == null ? null : numberField(record.lead_days),
      status: known ? status : "to_order",
      ordered_at: typeof record.ordered_at === "string" ? record.ordered_at : null,
      expected_at: typeof record.expected_at === "string" ? record.expected_at : null,
      delivered_at: typeof record.delivered_at === "string" ? record.delivered_at : null,
    }]
  })
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
