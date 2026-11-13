import { revalidatePath } from "next/cache"

import { failed, succeeded, type ActionResult } from "@/lib/action-result"
import { getSession, type Session } from "@/lib/session"

export async function ownerGuard(): Promise<{ ok: true; session: Session } | ActionResult> {
  const session = await getSession()
  if (!session) return failed("Sign in to continue.")
  if (session.role !== "owner") return failed(session.role === "viewer" ? "You can look, not change this." : "That action is for the studio.")
  return { ok: true, session }
}

export async function clientGuard(): Promise<{ ok: true; session: Session } | ActionResult> {
  const session = await getSession()
  if (!session) return failed("Sign in to continue.")
  if (session.role !== "client") return failed("That action is for the client portal.")
  return { ok: true, session }
}

export function refreshSurfaces(projectId?: string) {
  revalidatePath("/studio")
  revalidatePath("/studio/projects")
  revalidatePath("/studio/clients")
  revalidatePath("/studio/suppliers")
  revalidatePath("/portal")
  if (projectId) {
    revalidatePath(`/studio/projects/${projectId}`)
    revalidatePath(`/portal/projects/${projectId}`)
  }
}

export function saved(message: string): ActionResult {
  return succeeded(message)
}
