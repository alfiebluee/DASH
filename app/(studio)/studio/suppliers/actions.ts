"use server"

import { failed, type ActionResult } from "@/lib/action-result"
import { ownerGuard, refreshSurfaces, saved } from "@/lib/mutate"
import { createClient } from "@/lib/supabase/server"
import { supplierFormSchema } from "@/lib/validation/records"

function supplierFields(formData: FormData) {
  return supplierFormSchema.safeParse({
    name: formData.get("name"),
    website: formData.get("website") ?? "",
    default_lead_days: formData.get("default_lead_days") ?? 0,
  })
}

export async function addSupplier(formData: FormData): Promise<ActionResult> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return guard
  const parsed = supplierFields(formData)
  if (!parsed.success) return failed(parsed.error.issues[0]?.message ?? "Check the supplier.")
  const supabase = await createClient()
  const { error } = await supabase.from("suppliers").insert({
    name: parsed.data.name,
    website: parsed.data.website,
    default_lead_days: parsed.data.default_lead_days,
  })
  if (error) return failed("The supplier could not be created. That name may already be used.")
  refreshSurfaces()
  return saved("Supplier created.")
}

export async function saveSupplier(supplierId: string, formData: FormData): Promise<ActionResult> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return guard
  const parsed = supplierFields(formData)
  if (!parsed.success) return failed(parsed.error.issues[0]?.message ?? "Check the supplier.")
  const supabase = await createClient()
  const { error } = await supabase
    .from("suppliers")
    .update({
      name: parsed.data.name,
      website: parsed.data.website,
      default_lead_days: parsed.data.default_lead_days,
    })
    .eq("id", supplierId)
  if (error) return failed("The supplier could not be saved.")
  refreshSurfaces()
  return saved("Supplier saved.")
}
