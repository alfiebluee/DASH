import type { Stage, Status } from "@/lib/labels"
import { isStage, isStatus } from "@/lib/labels"

export type ProjectCard = {
  id: string
  name: string
  type: string
  stage: Stage
  status: Status
  due_date: string | null
  start_date: string | null
  pinned: boolean
  description: string
  client_id: string
  client_name: string
  updated_at: string
}

export type ClientRecord = {
  id: string
  name: string
  company: string
  email: string | null
  phone: string
  archived_at: string | null
}

export type SupplierRecord = {
  id: string
  name: string
  website: string
  default_lead_days: number
}

export type AreaRecord = {
  id: string
  project_id: string
  name: string
  sort_order: number
}

export type MaterialRecord = {
  id: string
  project_id: string
  area_id: string | null
  supplier_id: string | null
  item: string
  spec: string
  quantity: number
  unit_cost: number
  line_total: number
  link: string
  notes: string
  priority: "normal" | "high"
  lead_days: number | null
  status: "to_order" | "ordered" | "delivered" | "late" | "cancelled"
  ordered_at: string | null
  expected_at: string | null
  delivered_at: string | null
}

export type SettingsRecord = {
  business_name: string
  business_email: string
  deposit_percent: number
  away_from: string | null
  away_until: string | null
}

export type DocumentRecord = {
  id: string
  project_id: string
  kind: string
  title: string
  version: number
  file_path: string | null
  status: string
  sent_at: string | null
}

export type ActivityRecord = {
  id: string
  message: string
  comment: string
  created_at: string
}

export type StaffRow = {
  email: string
  full_name: string
  job_title: string
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}

function nullable(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

function clientName(value: unknown): string {
  const row = Array.isArray(value) ? value[0] : value
  if (!row || typeof row !== "object" || !("name" in row)) return ""
  return text(row.name)
}

export function toProject(row: unknown): ProjectCard | null {
  if (!row || typeof row !== "object") return null
  const record = row as Record<string, unknown>
  if (typeof record.id !== "string" || typeof record.name !== "string" || typeof record.client_id !== "string") return null
  if (!isStage(record.stage) || !isStatus(record.status)) return null
  return {
    id: record.id,
    name: record.name,
    type: text(record.type),
    stage: record.stage,
    status: record.status,
    due_date: nullable(record.due_date),
    start_date: nullable(record.start_date),
    pinned: record.pinned === true,
    description: text(record.description),
    client_id: record.client_id,
    client_name: clientName(record.clients),
    updated_at: text(record.updated_at),
  }
}

export function toClient(row: unknown): ClientRecord | null {
  if (!row || typeof row !== "object") return null
  const record = row as Record<string, unknown>
  if (typeof record.id !== "string" || typeof record.name !== "string") return null
  return {
    id: record.id,
    name: record.name,
    company: text(record.company),
    email: nullable(record.email),
    phone: text(record.phone),
    archived_at: nullable(record.archived_at),
  }
}

export function toDocument(row: unknown): DocumentRecord | null {
  if (!row || typeof row !== "object") return null
  const record = row as Record<string, unknown>
  if (typeof record.id !== "string" || typeof record.title !== "string") return null
  return {
    id: record.id,
    project_id: text(record.project_id),
    kind: text(record.kind),
    title: record.title,
    version: typeof record.version === "number" ? record.version : Number(record.version) || 1,
    file_path: nullable(record.file_path),
    status: text(record.status, "draft"),
    sent_at: nullable(record.sent_at),
  }
}

export function toActivity(row: unknown): ActivityRecord | null {
  if (!row || typeof row !== "object") return null
  const record = row as Record<string, unknown>
  if (typeof record.id !== "string") return null
  const metadata = record.metadata
  let comment = ""
  if (metadata && typeof metadata === "object" && "comment" in metadata && typeof metadata.comment === "string") {
    comment = metadata.comment
  }
  return {
    id: record.id,
    message: text(record.message),
    comment,
    created_at: text(record.created_at),
  }
}
