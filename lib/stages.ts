import { approvalLabel, stageLabel, stages, type ApprovalKind, type Stage } from "@/lib/labels"

export type GateApproval = {
  id?: string
  kind: ApprovalKind
  status: "pending" | "approved"
  gate_for_stage: Stage
}

export function isForward(from: Stage, to: Stage): boolean {
  return stages.indexOf(to) > stages.indexOf(from)
}

export function stagesBeingLeft(from: Stage, to: Stage): Stage[] {
  const start = stages.indexOf(from)
  const end = stages.indexOf(to)
  if (end <= start) return []
  return stages.slice(start, end)
}

export function blockingApprovals(from: Stage, to: Stage, approvals: GateApproval[]): GateApproval[] {
  const leaving = new Set(stagesBeingLeft(from, to))
  return approvals.filter((approval) => approval.status !== "approved" && leaving.has(approval.gate_for_stage))
}

export function gateWarning(pending: GateApproval[], target: Stage): string {
  const names = pending.map((approval) => approvalLabel(approval.kind))
  const list = names.length <= 1 ? names[0] ?? "An approval" : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
  const verb = names.length === 1 ? "is" : "are"
  return `${list} ${verb} still pending. Move to ${stageLabel(target)} anyway?`
}

export function nextStage(stage: Stage): Stage | null {
  const index = stages.indexOf(stage)
  return stages[index + 1] ?? null
}

export function readyToAdvance(stage: Stage, approvals: GateApproval[]): Stage | null {
  const gates = approvals.filter((approval) => approval.gate_for_stage === stage)
  if (gates.length === 0 || gates.some((approval) => approval.status !== "approved")) return null
  return nextStage(stage)
}

export function awaitingLabel(stage: Stage, approvals: GateApproval[]): string | null {
  const pending = approvals.filter((approval) => approval.gate_for_stage === stage && approval.status !== "approved")
  if (pending.length === 0) return null
  return pending.map((approval) => approvalLabel(approval.kind)).join(", ")
}

export function daysInStageLabel(enteredAt: string | null, now = new Date()): string {
  if (!enteredAt) return "Today"
  const entered = new Date(enteredAt).getTime()
  if (Number.isNaN(entered)) return "Today"
  const days = Math.max(0, Math.floor((now.getTime() - entered) / 86_400_000))
  if (days === 0) return "Today"
  if (days === 1) return "1 day"
  return `${days} days`
}
