"use server"

import { failed, type ActionResult } from "@/lib/action-result"
import { loadSettings } from "@/lib/data"
import { stageLabel, type Stage } from "@/lib/labels"
import { ownerGuard, refreshSurfaces, saved } from "@/lib/mutate"
import { createClient } from "@/lib/supabase/server"
import { documentFormSchema, projectFormSchema, stageSchema } from "@/lib/validation/records"

const fileTypes = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif"])

async function logStage(projectId: string, actorId: string, stage: Stage) {
  const supabase = await createClient()
  await supabase.from("activity_log").insert({
    project_id: projectId,
    actor_id: actorId,
    type: "stage",
    message: `Moved to ${stageLabel(stage)}`,
    client_visible: true,
  })
  if (stage === "review") {
    const { data } = await supabase.from("documents").select("id").eq("project_id", projectId).eq("kind", "sign_off").limit(1)
    if (!data || data.length === 0) {
      await supabase.from("documents").insert({
        project_id: projectId,
        kind: "sign_off",
        title: "Sign-off",
        status: "sent",
        sent_at: new Date().toISOString(),
        version: 1,
      })
    }
  }
}

export async function createProject(formData: FormData): Promise<ActionResult> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return guard
  const parsed = projectFormSchema.safeParse({
    client_id: formData.get("client_id"),
    name: formData.get("name"),
    type: formData.get("type") ?? "",
    stage: formData.get("stage") ?? "pipeline",
    status: formData.get("status") ?? "ongoing",
    start_date: formData.get("start_date") ?? "",
    due_date: formData.get("due_date") ?? "",
    description: formData.get("description") ?? "",
  })
  if (!parsed.success) return failed(parsed.error.issues[0]?.message ?? "Check the project details.")

  const settings = await loadSettings()
  const supabase = await createClient()
  const { error } = await supabase.from("projects").insert({
    ...parsed.data,
    deposit_percent: settings.deposit_percent,
  })
  if (error) return failed("The project could not be created.")
  refreshSurfaces()
  return saved("Project created.")
}

export async function saveProject(projectId: string, formData: FormData): Promise<ActionResult> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return guard
  const parsed = projectFormSchema.safeParse({
    client_id: formData.get("client_id"),
    name: formData.get("name"),
    type: formData.get("type") ?? "",
    stage: formData.get("stage"),
    status: formData.get("status"),
    start_date: formData.get("start_date") ?? "",
    due_date: formData.get("due_date") ?? "",
    description: formData.get("description") ?? "",
  })
  if (!parsed.success) return failed(parsed.error.issues[0]?.message ?? "Check the project details.")

  const supabase = await createClient()
  const { data: current } = await supabase.from("projects").select("stage").eq("id", projectId).maybeSingle()
  if (!current) return failed("Project not found.")
  const { error } = await supabase.from("projects").update(parsed.data).eq("id", projectId)
  if (error) return failed("The project could not be saved.")
  if (current.stage !== parsed.data.stage) await logStage(projectId, guard.session.id, parsed.data.stage)
  refreshSurfaces(projectId)
  return saved("Project saved.")
}

export async function moveProjectStage(projectId: string, stage: Stage): Promise<ActionResult> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return guard
  const parsed = stageSchema.safeParse(stage)
  if (!parsed.success) return failed("Choose a stage.")
  const supabase = await createClient()
  const { data: current } = await supabase.from("projects").select("stage").eq("id", projectId).maybeSingle()
  if (!current) return failed("Project not found.")
  if (current.stage === parsed.data) return saved(`Already in ${stageLabel(parsed.data)}.`)
  const { error } = await supabase.from("projects").update({ stage: parsed.data }).eq("id", projectId)
  if (error) return failed("The stage could not be saved.")
  await logStage(projectId, guard.session.id, parsed.data)
  refreshSurfaces(projectId)
  return saved(`Moved to ${stageLabel(parsed.data)}.`)
}

export async function pinProject(projectId: string, pinned: boolean): Promise<ActionResult> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return guard
  const supabase = await createClient()
  if (pinned) {
    const cleared = await supabase.from("projects").update({ pinned: false }).neq("id", projectId)
    if (cleared.error) return failed("The project could not be pinned.")
  }
  const { error } = await supabase.from("projects").update({ pinned }).eq("id", projectId)
  if (error) return failed("The project could not be pinned.")
  refreshSurfaces(projectId)
  return saved(pinned ? "Pinned to Focus." : "Unpinned.")
}

export async function updateProjectDates(
  projectId: string,
  dates: { start_date?: string | null; due_date?: string | null },
): Promise<ActionResult> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return guard
  const patch: { start_date?: string | null; due_date?: string | null; status?: "active" | "ongoing" } = {}
  if ("start_date" in dates) patch.start_date = dates.start_date || null
  if ("due_date" in dates) {
    patch.due_date = dates.due_date || null
    patch.status = patch.due_date ? "active" : "ongoing"
  }
  const supabase = await createClient()
  const { error } = await supabase.from("projects").update(patch).eq("id", projectId)
  if (error) return failed("The date could not be saved.")
  refreshSurfaces(projectId)
  return saved("Date saved.")
}

export async function uploadDocument(projectId: string, formData: FormData): Promise<ActionResult> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return guard
  const parsed = documentFormSchema.safeParse({
    kind: formData.get("kind"),
    title: formData.get("title"),
  })
  if (!parsed.success) return failed(parsed.error.issues[0]?.message ?? "Check the document.")
  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) return failed("Choose a PDF or image.")
  if (!fileTypes.has(file.type)) return failed("Use a PDF or an image.")
  if (file.size > 20 * 1024 * 1024) return failed("That file is larger than 20MB.")

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from("documents")
    .select("version")
    .eq("project_id", projectId)
    .eq("kind", parsed.data.kind)
    .eq("title", parsed.data.title)
    .order("version", { ascending: false })
    .limit(1)
  const version = (existing?.[0]?.version ?? 0) + 1
  const id = crypto.randomUUID()
  const safeName = file.name.replace(/[^\w.\-]+/g, "-").slice(0, 80) || "file"
  const path = `${projectId}/${id}/v${version}-${safeName}`
  const upload = await supabase.storage.from("documents").upload(path, file, { contentType: file.type })
  if (upload.error) return failed("The file could not be stored. Apply the storage migration, then try again.")

  const { error } = await supabase.from("documents").insert({
    id,
    project_id: projectId,
    kind: parsed.data.kind,
    title: parsed.data.title,
    version,
    file_path: path,
    status: "draft",
  })
  if (error) {
    await supabase.storage.from("documents").remove([path])
    return failed("The document could not be saved.")
  }
  await supabase.from("activity_log").insert({
    project_id: projectId,
    actor_id: guard.session.id,
    type: "document",
    message: `Added ${parsed.data.title} v${version}`,
    client_visible: false,
  })
  refreshSurfaces(projectId)
  return saved(`Added version ${version}.`)
}

export async function sendDocument(documentId: string): Promise<ActionResult> {
  const guard = await ownerGuard()
  if (!("session" in guard)) return guard
  const supabase = await createClient()
  const { data: document } = await supabase
    .from("documents")
    .select("id, project_id, title, status")
    .eq("id", documentId)
    .maybeSingle()
  if (!document) return failed("Document not found.")
  if (document.status === "approved") return failed("That document is already approved.")
  const { error } = await supabase
    .from("documents")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", documentId)
  if (error) return failed("The document could not be sent.")
  await supabase.from("activity_log").insert({
    project_id: document.project_id,
    actor_id: guard.session.id,
    type: "document_sent",
    message: `Sent ${document.title}`,
    client_visible: true,
  })
  refreshSurfaces(document.project_id)
  return saved("Sent to the client.")
}
