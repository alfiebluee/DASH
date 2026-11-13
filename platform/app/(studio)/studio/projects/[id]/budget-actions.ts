"use server"

import { failed, type ActionResult } from "@/lib/action-result"
import { moneyNumber } from "@/lib/money"
import { ownerGuard, refreshSurfaces, saved } from "@/lib/mutate"
import { createClient } from "@/lib/supabase/server"
import { budgetAmountSchema, customLineSchema } from "@/lib/validation/records"

const standardLines = [
  { label: "Design & Delivery", kind: "design_delivery", sort_order: 0 },
  { label: "Handyman", kind: "handyman", sort_order: 1 },
  { label: "Materials", kind: "materials", sort_order: 2 },
  { label: "Contingency", kind: "contingency", sort_order: 3 },
] as const

async function locked(projectId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase.from("projects").select("contract_value").eq("id", projectId).maybeSingle()
  return data?.contract_value != null
}

async function plannedMaterials(projectId: string): Promise<number> {
  const supabase = await createClient()
  const { data } = await supabase.from("materials").select("line_total, status").eq("project_id", projectId)
  return moneyNumber((data ?? []).reduce((sum, row) => (row.status === "cancelled" ? sum : sum + Number(row.line_total ?? 0)), 0))
}

export async function ensureBudgetLines(projectId: string): Promise<ActionResult> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return guard
  const supabase = await createClient()
  const existing = await supabase.from("budget_lines").select("kind").eq("project_id", projectId)
  if (existing.error) return failed("The budget could not be prepared.")
  const present = new Set((existing.data ?? []).map((row) => row.kind))
  const missing = standardLines.filter((line) => !present.has(line.kind))
  if (missing.length === 0) return saved("Budget lines are ready.")
  const planned = await plannedMaterials(projectId)
  const { error } = await supabase.from("budget_lines").insert(
    missing.map((line) => ({
      project_id: projectId,
      label: line.label,
      kind: line.kind,
      sort_order: line.sort_order,
      amount: line.kind === "materials" ? planned : 0,
    })),
  )
  if (error) return failed("The budget lines could not be added.")
  refreshSurfaces(projectId)
  return saved("Budget lines added.")
}

export async function saveBudgetAmount(projectId: string, lineId: string, amount: number): Promise<ActionResult> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return guard
  if (await locked(projectId)) return failed("This budget is locked.")
  const parsed = budgetAmountSchema.safeParse(amount)
  if (!parsed.success) return failed("Enter an amount.")
  const supabase = await createClient()
  const line = await supabase.from("budget_lines").select("kind").eq("id", lineId).eq("project_id", projectId).maybeSingle()
  if (!line.data) return failed("That line was not found.")
  if (line.data.kind === "materials") return failed("The materials line follows the materials list until the budget is approved.")
  const { error } = await supabase.from("budget_lines").update({ amount: parsed.data }).eq("id", lineId).eq("project_id", projectId)
  if (error) return failed("The amount could not be saved.")
  refreshSurfaces(projectId)
  return saved("Amount saved.")
}

export async function addCustomLine(projectId: string, label: string, amount: number): Promise<ActionResult> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return guard
  if (await locked(projectId)) return failed("This budget is locked.")
  const parsed = customLineSchema.safeParse({ label, amount })
  if (!parsed.success) return failed(parsed.error.issues[0]?.message ?? "Check the line.")
  const supabase = await createClient()
  const existing = await supabase.from("budget_lines").select("sort_order").eq("project_id", projectId).order("sort_order", { ascending: false }).limit(1)
  const { error } = await supabase.from("budget_lines").insert({
    project_id: projectId,
    label: parsed.data.label,
    kind: "other",
    amount: parsed.data.amount,
    sort_order: (existing.data?.[0]?.sort_order ?? 3) + 1,
  })
  if (error) return failed("The line could not be added.")
  refreshSurfaces(projectId)
  return saved("Line added.")
}

export async function removeCustomLine(projectId: string, lineId: string): Promise<ActionResult> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return guard
  if (await locked(projectId)) return failed("This budget is locked.")
  const supabase = await createClient()
  const { error } = await supabase.from("budget_lines").delete().eq("id", lineId).eq("project_id", projectId).eq("kind", "other")
  if (error) return failed("The line could not be removed.")
  refreshSurfaces(projectId)
  return saved("Line removed.")
}

export async function sendBudget(projectId: string): Promise<ActionResult> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return guard
  if (await locked(projectId)) return failed("This budget is already approved.")
  const ready = await ensureBudgetLines(projectId)
  if (!ready.ok && ready.message !== "Budget lines are ready.") return ready
  const supabase = await createClient()
  const planned = await plannedMaterials(projectId)
  const synced = await supabase.from("budget_lines").update({ amount: planned }).eq("project_id", projectId).eq("kind", "materials")
  if (synced.error) return failed("The materials line could not be updated.")
  const documents = await supabase
    .from("documents")
    .select("id, status, version")
    .eq("project_id", projectId)
    .eq("kind", "budget")
    .order("version", { ascending: false })
  if (documents.error) return failed("The budget document could not be read.")
  const latest = documents.data?.[0]
  if (latest?.status === "approved") return failed("This budget is already approved.")
  if (latest && latest.status !== "approved") {
    const update = await supabase.from("documents").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", latest.id)
    if (update.error) return failed("The budget could not be sent.")
  } else {
    const insert = await supabase.from("documents").insert({
      project_id: projectId,
      kind: "budget",
      title: "Budget",
      version: (latest?.version ?? 0) + 1,
      status: "sent",
      sent_at: new Date().toISOString(),
    })
    if (insert.error) return failed("The budget could not be sent.")
  }
  await supabase.from("activity_log").insert({
    project_id: projectId,
    actor_id: guard.session.id,
    type: "budget_sent",
    message: "Budget sent for approval",
    client_visible: true,
  })
  refreshSurfaces(projectId)
  return saved("Budget sent for approval.")
}
