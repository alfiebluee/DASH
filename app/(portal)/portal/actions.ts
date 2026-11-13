"use server"

import { failed, type ActionResult } from "@/lib/action-result"
import { clientGuard, refreshSurfaces, saved } from "@/lib/mutate"
import { createClient } from "@/lib/supabase/server"
import { approvalSchema } from "@/lib/validation/records"

async function decide(documentId: string, decision: "approved" | "changes_requested", comment: string): Promise<ActionResult> {
  const guard = await clientGuard()
  if (!("session" in guard)) return guard
  const parsed = approvalSchema.safeParse({ document_id: documentId, comment })
  if (!parsed.success) return failed("Check the comment.")
  if (decision === "changes_requested" && parsed.data.comment.length === 0) {
    return failed("Add a comment so the studio knows what to change.")
  }

  const supabase = await createClient()
  const { data: document } = await supabase
    .from("documents")
    .select("id, project_id, status, kind")
    .eq("id", documentId)
    .maybeSingle()
  if (!document) return failed("That document is not available.")
  if (document.status === "draft" || document.status === "approved") return failed("That document cannot be updated.")

  const { error } = await supabase.from("approvals").insert({
    document_id: documentId,
    user_id: guard.session.id,
    decision,
    comment: parsed.data.comment,
  })
  if (error) return failed("The decision could not be saved.")
  refreshSurfaces(document.project_id)
  return saved(decision === "approved" ? "Approved." : "Changes requested.")
}

export async function approveDocument(documentId: string): Promise<ActionResult> {
  return decide(documentId, "approved", "")
}

export async function requestChanges(documentId: string, formData: FormData): Promise<ActionResult> {
  return decide(documentId, "changes_requested", String(formData.get("comment") ?? ""))
}

export async function signOff(documentId: string, formData: FormData): Promise<ActionResult> {
  return decide(documentId, "approved", String(formData.get("comment") ?? ""))
}
