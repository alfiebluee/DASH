export const stages = ["pipeline", "brief", "design", "build", "review", "live"] as const
export type Stage = (typeof stages)[number]

export const statuses = ["active", "ongoing", "on_hold", "archived"] as const
export type Status = (typeof statuses)[number]

export const uploadKinds = ["proposal", "scope_of_work", "set_design", "other"] as const
export type UploadKind = (typeof uploadKinds)[number]

export function isStage(value: unknown): value is Stage {
  return typeof value === "string" && stages.includes(value as Stage)
}

export function isStatus(value: unknown): value is Status {
  return typeof value === "string" && statuses.includes(value as Status)
}

export function stageLabel(stage: Stage): string {
  if (stage === "pipeline") return "Pipeline"
  if (stage === "brief") return "Brief"
  if (stage === "design") return "Design"
  if (stage === "build") return "Build"
  if (stage === "review") return "Review"
  return "Live"
}

export function statusLabel(status: Status): string {
  if (status === "active") return "Active"
  if (status === "ongoing") return "Ongoing"
  if (status === "on_hold") return "On hold"
  return "Archived"
}

export function kindLabel(kind: string): string {
  if (kind === "proposal") return "Proposal"
  if (kind === "scope_of_work") return "Scope of work"
  if (kind === "set_design") return "Set design"
  if (kind === "budget") return "Budget"
  if (kind === "sign_off") return "Sign-off"
  return "Other"
}

export function formatDue(due: string | null, status: Status): string {
  if (!due) return status === "ongoing" ? "Ongoing" : "No date"
  const [year, month, day] = due.split("-").map(Number)
  if (!year || !month || !day) return due
  const date = new Date(Date.UTC(year, month - 1, day))
  const formatted = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date)
  return `Due ${formatted}`
}

export function materialStatusLabel(status: string): string {
  if (status === "to_order") return "To order"
  if (status === "ordered") return "Ordered"
  if (status === "delivered") return "Delivered"
  if (status === "late") return "Late"
  if (status === "cancelled") return "Cancelled"
  if (status === "draft") return "Draft"
  return status
}

export function statusClass(status: string): string {
  if (status === "approved" || status === "active") return "bg-brand-tint text-brand-hover"
  if (status === "changes_requested" || status === "on_hold") return "bg-danger/10 text-danger"
  if (status === "sent" || status === "ongoing") return "bg-focus text-ink"
  return "bg-column text-ink-2"
}
