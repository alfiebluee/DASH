"use server"

import { failed, type ActionResult } from "@/lib/action-result"
import { ownerGuard, refreshSurfaces, saved } from "@/lib/mutate"
import { createClient } from "@/lib/supabase/server"
import { settingsFormSchema } from "@/lib/validation/settings"

export async function saveSettings(formData: FormData): Promise<ActionResult> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return guard
  const parsed = settingsFormSchema.safeParse({
    business_name: formData.get("business_name"),
    business_email: formData.get("business_email"),
    deposit_percent: formData.get("deposit_percent"),
    away_from: formData.get("away_from") ?? "",
    away_until: formData.get("away_until") ?? "",
  })
  if (!parsed.success) return failed(parsed.error.issues[0]?.message ?? "Check the settings.")
  if (parsed.data.away_from && parsed.data.away_until && parsed.data.away_until < parsed.data.away_from) {
    return failed("Away until is before away from.")
  }

  const supabase = await createClient()
  const patch = {
    business_name: parsed.data.business_name,
    business_email: parsed.data.business_email.toLowerCase(),
    deposit_percent: parsed.data.deposit_percent,
    away_from: parsed.data.away_from || null,
    away_until: parsed.data.away_until || null,
  }
  const { data: existing } = await supabase.from("settings").select("id").limit(1).maybeSingle()
  const result = existing
    ? await supabase.from("settings").update(patch).eq("id", existing.id)
    : await supabase.from("settings").insert(patch)
  if (result.error) return failed("Those details could not be saved.")
  refreshSurfaces()
  return saved("Settings saved.")
}
