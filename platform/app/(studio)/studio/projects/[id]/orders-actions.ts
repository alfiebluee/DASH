"use server"

import { failed, type ActionResult } from "@/lib/action-result"
import { moneyNumber, orderTotal } from "@/lib/money"
import { ownerGuard, refreshSurfaces, saved } from "@/lib/mutate"
import { createClient } from "@/lib/supabase/server"
import { orderFormSchema } from "@/lib/validation/records"

function cardNumber(value: string): boolean {
  const digits = value.replace(/[\s-]/g, "")
  return /^\d{12,19}$/.test(digits)
}

async function itemsTotal(projectId: string, orderId: string): Promise<number | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("materials").select("line_total, status").eq("project_id", projectId).eq("order_id", orderId)
  if (error) return null
  return moneyNumber((data ?? []).reduce((sum, row) => (row.status === "cancelled" ? sum : sum + Number(row.line_total ?? 0)), 0))
}

export async function createOrder(projectId: string, materialIds: string[], input: unknown): Promise<ActionResult> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return guard
  if (materialIds.length === 0) return failed("Select at least one item.")
  const parsed = orderFormSchema.safeParse(input)
  if (!parsed.success) return failed(parsed.error.issues[0]?.message ?? "Check the order.")
  if (cardNumber(parsed.data.paid_with)) return failed("Use a label such as Lloyds or Amex, not a card number.")
  const supabase = await createClient()
  const materials = await supabase.from("materials").select("id, line_total, supplier_id, status").in("id", materialIds).eq("project_id", projectId)
  if (materials.error || !materials.data || materials.data.length !== materialIds.length) return failed("Those items could not be grouped.")
  const supplierId = parsed.data.supplier_id || materials.data.find((row) => row.supplier_id)?.supplier_id || null
  if (!supplierId) return failed("Choose a supplier for this order.")
  const suppliers = new Set(materials.data.map((row) => row.supplier_id).filter(Boolean))
  if (!parsed.data.supplier_id && suppliers.size > 1) return failed("Choose one supplier. This checkout is for a single supplier.")
  if (parsed.data.supplier_id) {
    const assigned = await supabase.from("materials").update({ supplier_id: parsed.data.supplier_id }).in("id", materialIds).eq("project_id", projectId)
    if (assigned.error) return failed("The supplier could not be set on those items.")
  }
  const totalItems = moneyNumber(materials.data.reduce((sum, row) => (row.status === "cancelled" ? sum : sum + Number(row.line_total ?? 0)), 0))
  const total = orderTotal({
    itemsTotal: totalItems,
    vat: parsed.data.vat,
    vatIncluded: parsed.data.vat_included,
    delivery: parsed.data.delivery,
  })
  const created = await supabase
    .from("orders")
    .insert({
      project_id: projectId,
      supplier_id: supplierId,
      reference: parsed.data.reference,
      items_total: totalItems,
      vat: parsed.data.vat,
      vat_included: parsed.data.vat_included,
      delivery_cost: parsed.data.delivery,
      total,
      paid_with: parsed.data.paid_with,
      status: parsed.data.status,
      expected_at: parsed.data.expected_at || null,
    })
    .select("id")
    .single()
  if (created.error || !created.data) return failed("The order could not be created.")
  const linked = await supabase.from("materials").update({ order_id: created.data.id }).in("id", materialIds).eq("project_id", projectId)
  if (linked.error) return failed("The items could not be added to the order.")
  const touched = await supabase.from("orders").update({ reference: parsed.data.reference }).eq("id", created.data.id)
  if (touched.error) return failed("The order dates could not be applied.")
  if (parsed.data.status === "ordered") {
    const ordered = await supabase.from("materials").update({ status: "ordered" }).in("id", materialIds).eq("project_id", projectId).in("status", ["to_order", "late"])
    if (ordered.error) return failed("The items could not be marked ordered.")
  }
  await supabase.from("activity_log").insert({
    project_id: projectId,
    actor_id: guard.session.id,
    type: "order",
    message: `Order ${parsed.data.reference || "created"} · ${total.toFixed(2)}`,
    client_visible: false,
  })
  refreshSurfaces(projectId)
  return saved("Order created.")
}

export async function saveOrder(projectId: string, orderId: string, input: unknown): Promise<ActionResult> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return guard
  const parsed = orderFormSchema.safeParse(input)
  if (!parsed.success) return failed(parsed.error.issues[0]?.message ?? "Check the order.")
  if (cardNumber(parsed.data.paid_with)) return failed("Use a label such as Lloyds or Amex, not a card number.")
  const currentItems = await itemsTotal(projectId, orderId)
  if (currentItems == null) return failed("The order items could not be read.")
  const total = orderTotal({
    itemsTotal: currentItems,
    vat: parsed.data.vat,
    vatIncluded: parsed.data.vat_included,
    delivery: parsed.data.delivery,
  })
  const supabase = await createClient()
  const { error } = await supabase
    .from("orders")
    .update({
      supplier_id: parsed.data.supplier_id || null,
      reference: parsed.data.reference,
      items_total: currentItems,
      vat: parsed.data.vat,
      vat_included: parsed.data.vat_included,
      delivery_cost: parsed.data.delivery,
      total,
      paid_with: parsed.data.paid_with,
      status: parsed.data.status,
      expected_at: parsed.data.expected_at || null,
    })
    .eq("id", orderId)
    .eq("project_id", projectId)
  if (error) return failed("The order could not be saved.")
  if (parsed.data.status === "ordered") {
    await supabase.from("materials").update({ status: "ordered" }).eq("order_id", orderId).eq("project_id", projectId).in("status", ["to_order"])
  }
  refreshSurfaces(projectId)
  return saved("Order saved.")
}
