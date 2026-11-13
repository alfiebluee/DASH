"use server"

import { failed, type ActionResult } from "@/lib/action-result"
import { moneyNumber } from "@/lib/money"
import { ownerGuard, refreshSurfaces, saved } from "@/lib/mutate"
import { toMaterial, type MaterialRecord, type MaterialSuggestion } from "@/lib/records"
import { createClient } from "@/lib/supabase/server"
import { areaFormSchema, importSchema, materialFormSchema, materialPatchSchema, materialRestoreSchema } from "@/lib/validation/records"

const materialColumns = "id, project_id, area_id, supplier_id, order_id, item, spec, quantity, unit_cost, line_total, actual_cost, link, notes, priority, lead_days, status, ordered_at, expected_at, delivered_at, sort_order"

function blankToNull(value: string): string | null {
  return value ? value : null
}

function dayStamp(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined
  if (!value) return null
  return `${value}T12:00:00.000Z`
}

async function syncMaterialsLine(projectId: string) {
  const supabase = await createClient()
  const project = await supabase.from("projects").select("contract_value").eq("id", projectId).maybeSingle()
  if (project.error || project.data?.contract_value != null) return
  const materials = await supabase.from("materials").select("line_total, status").eq("project_id", projectId)
  if (materials.error) return
  const planned = moneyNumber(
    (materials.data ?? []).reduce((sum, row) => (row.status === "cancelled" ? sum : sum + Number(row.line_total ?? 0)), 0),
  )
  await supabase.from("budget_lines").update({ amount: planned }).eq("project_id", projectId).eq("kind", "materials")
}

async function nextSort(projectId: string): Promise<number> {
  const supabase = await createClient()
  const { data } = await supabase.from("materials").select("sort_order").eq("project_id", projectId).order("sort_order", { ascending: false }).limit(1)
  return (data?.[0]?.sort_order ?? -1) + 1
}

export async function addArea(projectId: string, formData: FormData): Promise<ActionResult> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return guard
  const parsed = areaFormSchema.safeParse({ name: formData.get("name") })
  if (!parsed.success) return failed(parsed.error.issues[0]?.message ?? "Give the area a name.")
  const supabase = await createClient()
  const existing = await supabase.from("areas").select("sort_order").eq("project_id", projectId).order("sort_order", { ascending: false }).limit(1)
  const { error } = await supabase.from("areas").insert({
    project_id: projectId,
    name: parsed.data.name,
    sort_order: (existing.data?.[0]?.sort_order ?? -1) + 1,
  })
  if (error) return failed("The area could not be added.")
  refreshSurfaces(projectId)
  return saved("Area added.")
}

export async function renameArea(projectId: string, areaId: string, name: string): Promise<ActionResult> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return guard
  const parsed = areaFormSchema.safeParse({ name })
  if (!parsed.success) return failed(parsed.error.issues[0]?.message ?? "Give the area a name.")
  const supabase = await createClient()
  const { error } = await supabase.from("areas").update({ name: parsed.data.name }).eq("id", areaId).eq("project_id", projectId)
  if (error) return failed("The area could not be renamed.")
  refreshSurfaces(projectId)
  return saved("Area renamed.")
}

export async function placeArea(projectId: string, areaId: string, beforeId: string | null): Promise<ActionResult> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return guard
  const supabase = await createClient()
  const { data, error } = await supabase.from("areas").select("id").eq("project_id", projectId).order("sort_order")
  if (error || !data) return failed("The areas could not be reordered.")
  const ids = data.map((row) => row.id).filter((id) => id !== areaId)
  const index = beforeId ? ids.indexOf(beforeId) : ids.length
  ids.splice(index < 0 ? ids.length : index, 0, areaId)
  for (let sort = 0; sort < ids.length; sort += 1) {
    const update = await supabase.from("areas").update({ sort_order: sort }).eq("id", ids[sort]).eq("project_id", projectId)
    if (update.error) return failed("The areas could not be reordered.")
  }
  refreshSurfaces(projectId)
  return saved("Areas reordered.")
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
    sort_order: await nextSort(projectId),
  })
  if (error) return failed("The item could not be added.")
  await syncMaterialsLine(projectId)
  refreshSurfaces(projectId)
  return saved("Item added.")
}

export async function updateMaterial(
  projectId: string,
  materialId: string,
  patch: unknown,
): Promise<ActionResult & { material?: MaterialRecord }> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return guard
  const parsed = materialPatchSchema.safeParse(patch)
  if (!parsed.success) return failed(parsed.error.issues[0]?.message ?? "Check the item.")
  const { delivered_at: deliveredDay, ...rest } = parsed.data
  const update = {
    ...rest,
    ...(deliveredDay !== undefined ? { delivered_at: dayStamp(deliveredDay) } : {}),
  }
  if (Object.keys(update).length === 0) return saved("Saved.")
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("materials")
    .update(update)
    .eq("id", materialId)
    .eq("project_id", projectId)
    .select(materialColumns)
    .single()
  if (error) return failed("The item could not be saved.")
  await syncMaterialsLine(projectId)
  const material = toMaterial(data)
  return material ? { ...saved("Saved."), material } : saved("Saved.")
}

export async function updateManyMaterials(projectId: string, ids: string[], patch: unknown): Promise<ActionResult> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return guard
  if (ids.length === 0) return failed("Select at least one item.")
  const parsed = materialPatchSchema.safeParse(patch)
  if (!parsed.success) return failed(parsed.error.issues[0]?.message ?? "Check the update.")
  const supabase = await createClient()
  const { error } = await supabase.from("materials").update(parsed.data).in("id", ids).eq("project_id", projectId)
  if (error) return failed("Those items could not be updated.")
  await syncMaterialsLine(projectId)
  refreshSurfaces(projectId)
  return saved("Items updated.")
}

export async function placeMaterial(projectId: string, materialId: string, areaId: string | null, beforeId: string | null): Promise<ActionResult> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return guard
  const supabase = await createClient()
  const { data, error } = await supabase.from("materials").select("id, area_id").eq("project_id", projectId).order("sort_order")
  if (error || !data) return failed("The item could not be moved.")
  const destination = data.filter((row) => row.id !== materialId && (row.area_id ?? null) === areaId).map((row) => row.id)
  const index = beforeId ? destination.indexOf(beforeId) : destination.length
  destination.splice(index < 0 ? destination.length : index, 0, materialId)
  for (let sort = 0; sort < destination.length; sort += 1) {
    const changes = destination[sort] === materialId ? { sort_order: sort, area_id: areaId } : { sort_order: sort }
    const update = await supabase.from("materials").update(changes).eq("id", destination[sort]).eq("project_id", projectId)
    if (update.error) return failed("The item could not be moved.")
  }
  refreshSurfaces(projectId)
  return saved("Item moved.")
}

export async function duplicateMaterial(projectId: string, materialId: string): Promise<ActionResult> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return guard
  const supabase = await createClient()
  const { data, error } = await supabase.from("materials").select(materialColumns).eq("id", materialId).eq("project_id", projectId).maybeSingle()
  const source = toMaterial(data)
  if (error || !source) return failed("That item could not be duplicated.")
  const copy = await supabase.from("materials").insert({
    project_id: projectId,
    area_id: source.area_id,
    supplier_id: source.supplier_id,
    item: source.item,
    spec: source.spec,
    quantity: source.quantity,
    unit_cost: source.unit_cost,
    actual_cost: source.actual_cost,
    link: source.link,
    notes: source.notes,
    priority: source.priority,
    lead_days: source.lead_days,
    status: source.status,
    ordered_at: source.ordered_at,
    expected_at: source.expected_at,
    delivered_at: source.delivered_at,
    sort_order: source.sort_order + 1,
  })
  if (copy.error) return failed("The item could not be duplicated.")
  await syncMaterialsLine(projectId)
  refreshSurfaces(projectId)
  return saved("Item duplicated.")
}

export async function setMaterialStatus(projectId: string, materialId: string, status: "ordered" | "delivered" | "to_order"): Promise<ActionResult> {
  return updateManyMaterials(projectId, [materialId], { status })
}

export async function deleteMaterial(projectId: string, materialId: string): Promise<ActionResult> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return guard
  const supabase = await createClient()
  const { error } = await supabase.from("materials").delete().eq("id", materialId).eq("project_id", projectId)
  if (error) return failed("The item could not be removed.")
  await syncMaterialsLine(projectId)
  refreshSurfaces(projectId)
  return saved("Item removed.")
}

export async function restoreMaterial(projectId: string, input: unknown): Promise<ActionResult> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return guard
  const parsed = materialRestoreSchema.safeParse(input)
  if (!parsed.success) return failed(parsed.error.issues[0]?.message ?? "The item could not be restored.")
  const supabase = await createClient()
  const { error } = await supabase.from("materials").insert({
    id: parsed.data.id,
    project_id: projectId,
    item: parsed.data.item,
    spec: parsed.data.spec,
    quantity: parsed.data.quantity,
    unit_cost: parsed.data.unit_cost,
    actual_cost: parsed.data.actual_cost,
    supplier_id: parsed.data.supplier_id,
    area_id: parsed.data.area_id,
    order_id: parsed.data.order_id,
    lead_days: parsed.data.lead_days,
    priority: parsed.data.priority,
    notes: parsed.data.notes,
    link: parsed.data.link,
    status: parsed.data.status,
    ordered_at: parsed.data.ordered_at,
    expected_at: parsed.data.expected_at,
    delivered_at: parsed.data.delivered_at,
    sort_order: parsed.data.sort_order,
  })
  if (error) return failed("The item could not be restored.")
  await syncMaterialsLine(projectId)
  refreshSurfaces(projectId)
  return saved("Item restored.")
}

export async function suggestMaterials(query: string): Promise<MaterialSuggestion[]> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return []
  const needle = query.trim().replace(/[%_\\]/g, "")
  if (needle.length < 2) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from("materials")
    .select("item, spec, unit_cost, link, lead_days, supplier_id, suppliers(name)")
    .ilike("item", `%${needle}%`)
    .order("updated_at", { ascending: false })
    .limit(30)
  const seen = new Set<string>()
  const suggestions: MaterialSuggestion[] = []
  for (const row of data ?? []) {
    const supplier = Array.isArray(row.suppliers) ? row.suppliers[0] : row.suppliers
    const supplierName = supplier && typeof supplier === "object" && "name" in supplier && typeof supplier.name === "string" ? supplier.name : ""
    const unit = Number(row.unit_cost ?? 0)
    const key = `${row.item}|${supplierName}|${unit}|${row.link ?? ""}`
    if (seen.has(key)) continue
    seen.add(key)
    suggestions.push({
      item: row.item,
      spec: row.spec ?? "",
      unit_cost: Number.isFinite(unit) ? unit : 0,
      link: row.link ?? "",
      supplier_id: row.supplier_id,
      supplier_name: supplierName,
      lead_days: row.lead_days,
    })
    if (suggestions.length === 8) break
  }
  return suggestions
}

export async function importMaterials(projectId: string, groups: unknown): Promise<ActionResult> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return guard
  const parsed = importSchema.safeParse(groups)
  if (!parsed.success) return failed(parsed.error.issues[0]?.message ?? "Check the spreadsheet rows.")
  const itemCount = parsed.data.reduce((sum, group) => sum + group.items.length, 0)
  const areaCount = parsed.data.filter((group) => group.area && group.items.length === 0).length
    + parsed.data.filter((group) => group.area && group.items.length > 0).length
  if (itemCount === 0 && areaCount === 0) return failed("Nothing to import.")
  const supabase = await createClient()
  const suppliers = await supabase.from("suppliers").select("id, name")
  if (suppliers.error) return failed("Suppliers could not be read.")
  const byName = new Map<string, string>()
  for (const supplier of suppliers.data ?? []) byName.set(supplier.name.toLowerCase(), supplier.id)
  for (const group of parsed.data) {
    for (const item of group.items) {
      const name = item.supplier_name.trim()
      if (!name || byName.has(name.toLowerCase())) continue
      const created = await supabase.from("suppliers").insert({ name, default_lead_days: item.lead_days ?? 0 }).select("id").single()
      if (created.error || !created.data) return failed(`Could not add supplier ${name}.`)
      byName.set(name.toLowerCase(), created.data.id)
    }
  }
  const areas = await supabase.from("areas").select("id, name, sort_order").eq("project_id", projectId)
  if (areas.error) return failed("Areas could not be read.")
  const areaIds = new Map<string, string>()
  let nextArea = -1
  for (const area of areas.data ?? []) {
    areaIds.set(area.name.toLowerCase(), area.id)
    nextArea = Math.max(nextArea, area.sort_order)
  }
  nextArea += 1
  let sort = await nextSort(projectId)
  let imported = 0
  for (const group of parsed.data) {
    let areaId: string | null = null
    if (group.area) {
      const key = group.area.toLowerCase()
      areaId = areaIds.get(key) ?? null
      if (!areaId) {
        const created = await supabase.from("areas").insert({ project_id: projectId, name: group.area, sort_order: nextArea }).select("id").single()
        nextArea += 1
        if (created.error || !created.data?.id) return failed("An area could not be added.")
        areaId = created.data.id
        areaIds.set(key, created.data.id)
      }
    }
    if (group.items.length === 0) continue
    const inserted = await supabase.from("materials").insert(group.items.map((item) => {
      const row = {
        project_id: projectId,
        area_id: areaId,
        supplier_id: item.supplier_name ? byName.get(item.supplier_name.toLowerCase()) ?? null : null,
        item: item.item,
        spec: item.spec,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        link: item.link,
        notes: item.notes,
        priority: item.priority,
        lead_days: item.lead_days,
        status: item.status,
        ordered_at: item.ordered_at,
        expected_at: item.expected_at,
        delivered_at: item.delivered_at ? `${item.delivered_at}T12:00:00.000Z` : null,
        sort_order: sort,
      }
      sort += 1
      imported += 1
      return row
    }))
    if (inserted.error) return failed("Some rows could not be imported.")
  }
  await syncMaterialsLine(projectId)
  refreshSurfaces(projectId)
  return saved(`Imported ${imported} item${imported === 1 ? "" : "s"}.`)
}
