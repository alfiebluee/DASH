"use server"

import { failed, type ActionResult } from "@/lib/action-result"
import { ownerGuard, refreshSurfaces, saved } from "@/lib/mutate"
import { createClient } from "@/lib/supabase/server"
import { areaFormSchema, materialFormSchema } from "@/lib/validation/records"

function blankToNull(value: string): string | null {
  return value ? value : null
}

export async function addArea(projectId: string, formData: FormData): Promise<ActionResult> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return guard
  const parsed = areaFormSchema.safeParse({ name: formData.get("name") })
  if (!parsed.success) return failed(parsed.error.issues[0]?.message ?? "Give the area a name.")
  const supabase = await createClient()
  const { error } = await supabase.from("areas").insert({ project_id: projectId, name: parsed.data.name })
  if (error) return failed("The area could not be added.")
  refreshSurfaces(projectId)
  return saved("Area added.")
}

export async function addMaterial(projectId: string, formData: FormData): Promise<ActionResult> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return guard
  const parsed = materialFormSchema.safeParse({
    item: formData.get("item"),
    spec: formData.get("spec") ?? "",
    quantity: formData.get("quantity") ?? 1,
    unit_cost: formData.get("unit_cost") ?? 0,
    supplier_id: formData.get("supplier_id") ?? "",
    area_id: formData.get("area_id") ?? "",
    lead_days: String(formData.get("lead_days") ?? ""),
    priority: formData.get("priority") ?? "normal",
    notes: formData.get("notes") ?? "",
    link: formData.get("link") ?? "",
  })
  if (!parsed.success) return failed(parsed.error.issues[0]?.message ?? "Check the item.")
  const lead = parsed.data.lead_days === "" ? null : Number(parsed.data.lead_days)
  if (lead !== null && (!Number.isInteger(lead) || lead < 0)) return failed("Lead time must be a number of days.")
  const supabase = await createClient()
  const { error } = await supabase.from("materials").insert({
    project_id: projectId,
    item: parsed.data.item,
    spec: parsed.data.spec,
    quantity: parsed.data.quantity,
    unit_cost: parsed.data.unit_cost,
    supplier_id: blankToNull(parsed.data.supplier_id),
    area_id: blankToNull(parsed.data.area_id),
    lead_days: lead,
    priority: parsed.data.priority,
    notes: parsed.data.notes,
    link: parsed.data.link,
  })
  if (error) return failed("The item could not be added.")
  refreshSurfaces(projectId)
  return saved("Item added.")
}

export async function setMaterialStatus(projectId: string, materialId: string, status: "ordered" | "delivered" | "to_order"): Promise<ActionResult> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return guard
  const supabase = await createClient()
  const { error } = await supabase.from("materials").update({ status }).eq("id", materialId).eq("project_id", projectId)
  if (error) return failed("The item could not be updated.")
  refreshSurfaces(projectId)
  return saved(status === "ordered" ? "Marked ordered." : status === "delivered" ? "Marked delivered." : "Moved back to order.")
}

export async function deleteMaterial(projectId: string, materialId: string): Promise<ActionResult> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return guard
  const supabase = await createClient()
  const { error } = await supabase.from("materials").delete().eq("id", materialId).eq("project_id", projectId)
  if (error) return failed("The item could not be removed.")
  refreshSurfaces(projectId)
  return saved("Item removed.")
}

export async function restoreMaterial(projectId: string, fields: {
  item: string
  spec: string
  quantity: number
  unit_cost: number
  supplier_id: string | null
  area_id: string | null
  lead_days: number | null
  priority: "normal" | "high"
  notes: string
  link: string
  status: "to_order" | "ordered" | "delivered" | "late" | "cancelled"
}): Promise<ActionResult> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return guard
  const supabase = await createClient()
  const { error } = await supabase.from("materials").insert({ project_id: projectId, ...fields })
  if (error) return failed("The item could not be restored.")
  refreshSurfaces(projectId)
  return saved("Item restored.")
}
