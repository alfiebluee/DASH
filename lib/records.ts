import type { ApprovalKind, Stage, Status } from "@/lib/labels"
import { isApprovalKind, isStage, isStatus } from "@/lib/labels"

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
  contract_value: number | null
  updated_at: string
  stage_entered_at: string | null
  gates: ProjectGate[]
}

export type ProjectGate = {
  id: string
  project_id: string
  kind: ApprovalKind
  status: "pending" | "approved"
  gate_for_stage: Stage
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

export type MaterialStatus = "to_order" | "ordered" | "delivered" | "late" | "cancelled"

export type MaterialRecord = {
  id: string
  project_id: string
  area_id: string | null
  supplier_id: string | null
  order_id: string | null
  item: string
  spec: string
  quantity: number
  unit_cost: number
  line_total: number
  actual_cost: number | null
  link: string
  notes: string
  priority: "normal" | "high"
  lead_days: number | null
  status: MaterialStatus
  ordered_at: string | null
  expected_at: string | null
  delivered_at: string | null
  sort_order: number
}

export type OrderStatus = "draft" | "ordered" | "delivered" | "late" | "cancelled"

export type OrderRecord = {
  id: string
  project_id: string
  supplier_id: string | null
  supplier_name: string
  reference: string
  items_total: number
  vat: number
  vat_included: boolean
  delivery_cost: number
  total: number
  paid_with: string
  status: OrderStatus
  ordered_at: string | null
  expected_at: string | null
  delivered_at: string | null
}

export type BudgetKind = "design_delivery" | "handyman" | "materials" | "contingency" | "other"

export type BudgetLineRecord = {
  id: string
  project_id: string
  label: string
  kind: BudgetKind
  amount: number
  sort_order: number
}

export type BudgetSummary = {
  agreed_total: number
  design_delivery: number
  handyman: number
  materials_line: number
  contingency: number
  other_lines: number
  materials_planned: number
  materials_actual: number
  delivery_charges: number
  contingency_remaining: number
  contingency_percent_used: number
}

export type ClientMaterial = {
  area: string
  item: string
  quantity: number
  status: MaterialStatus
  expected_at: string | null
  delivered_at: string | null
}

export type DeliveryWatch = {
  id: string
  item: string
  project_id: string
  project_name: string
  expected_at: string
  status: MaterialStatus
}

export type MaterialSuggestion = {
  item: string
  spec: string
  unit_cost: number
  link: string
  supplier_id: string | null
  supplier_name: string
  lead_days: number | null
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

export function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
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
    contract_value: record.contract_value == null || record.contract_value === "" ? null : asNumber(record.contract_value),
    updated_at: text(record.updated_at),
    stage_entered_at: null,
    gates: [],
  }
}

export function toProjectGate(row: unknown): ProjectGate | null {
  if (!row || typeof row !== "object") return null
  const record = row as Record<string, unknown>
  if (typeof record.id !== "string" || typeof record.project_id !== "string") return null
  if (!isApprovalKind(record.kind) || !isStage(record.gate_for_stage)) return null
  return {
    id: record.id,
    project_id: record.project_id,
    kind: record.kind,
    status: record.status === "approved" ? "approved" : "pending",
    gate_for_stage: record.gate_for_stage,
  }
}

const materialStatuses: MaterialStatus[] = ["to_order", "ordered", "delivered", "late", "cancelled"]
const orderStatuses: OrderStatus[] = ["draft", "ordered", "delivered", "late", "cancelled"]
const budgetKinds: BudgetKind[] = ["design_delivery", "handyman", "materials", "contingency", "other"]

export function toMaterial(row: unknown): MaterialRecord | null {
  if (!row || typeof row !== "object") return null
  const record = row as Record<string, unknown>
  if (typeof record.id !== "string" || typeof record.item !== "string" || typeof record.project_id !== "string") return null
  const status = materialStatuses.find((item) => item === record.status) ?? "to_order"
  return {
    id: record.id,
    project_id: record.project_id,
    area_id: typeof record.area_id === "string" ? record.area_id : null,
    supplier_id: typeof record.supplier_id === "string" ? record.supplier_id : null,
    order_id: typeof record.order_id === "string" ? record.order_id : null,
    item: record.item,
    spec: text(record.spec),
    quantity: asNumber(record.quantity),
    unit_cost: asNumber(record.unit_cost),
    line_total: asNumber(record.line_total),
    actual_cost: record.actual_cost == null || record.actual_cost === "" ? null : asNumber(record.actual_cost),
    link: text(record.link),
    notes: text(record.notes),
    priority: record.priority === "high" ? "high" : "normal",
    lead_days: record.lead_days == null || record.lead_days === "" ? null : asNumber(record.lead_days),
    status,
    ordered_at: nullable(record.ordered_at),
    expected_at: nullable(record.expected_at),
    delivered_at: nullable(record.delivered_at),
    sort_order: asNumber(record.sort_order),
  }
}

export function toOrder(row: unknown): OrderRecord | null {
  if (!row || typeof row !== "object") return null
  const record = row as Record<string, unknown>
  if (typeof record.id !== "string" || typeof record.project_id !== "string") return null
  const status = orderStatuses.find((item) => item === record.status) ?? "draft"
  return {
    id: record.id,
    project_id: record.project_id,
    supplier_id: typeof record.supplier_id === "string" ? record.supplier_id : null,
    supplier_name: clientName(record.suppliers),
    reference: text(record.reference),
    items_total: asNumber(record.items_total),
    vat: asNumber(record.vat),
    vat_included: record.vat_included === true,
    delivery_cost: asNumber(record.delivery_cost),
    total: asNumber(record.total),
    paid_with: text(record.paid_with),
    status,
    ordered_at: nullable(record.ordered_at),
    expected_at: nullable(record.expected_at),
    delivered_at: nullable(record.delivered_at),
  }
}

export function toBudgetLine(row: unknown): BudgetLineRecord | null {
  if (!row || typeof row !== "object") return null
  const record = row as Record<string, unknown>
  if (typeof record.id !== "string" || typeof record.project_id !== "string" || typeof record.label !== "string") return null
  const kind = budgetKinds.find((item) => item === record.kind)
  if (!kind) return null
  return {
    id: record.id,
    project_id: record.project_id,
    label: record.label,
    kind,
    amount: asNumber(record.amount),
    sort_order: asNumber(record.sort_order),
  }
}

export function toBudgetSummary(row: unknown): BudgetSummary | null {
  if (!row || typeof row !== "object") return null
  const record = row as Record<string, unknown>
  return {
    agreed_total: asNumber(record.agreed_total),
    design_delivery: asNumber(record.design_delivery),
    handyman: asNumber(record.handyman),
    materials_line: asNumber(record.materials_line),
    contingency: asNumber(record.contingency),
    other_lines: asNumber(record.other_lines),
    materials_planned: asNumber(record.materials_planned),
    materials_actual: asNumber(record.materials_actual),
    delivery_charges: asNumber(record.delivery_charges),
    contingency_remaining: asNumber(record.contingency_remaining),
    contingency_percent_used: asNumber(record.contingency_percent_used),
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
