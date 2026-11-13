import { redirect } from "next/navigation"

import { StudioAccess } from "@/components/studio-access"
import { StudioShell } from "@/components/StudioShell"
import { loadClients, loadProjects } from "@/lib/data"
import { getSession } from "@/lib/session"

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect("/login")
  if (session.role === "client") redirect("/portal")
  const [projects, clients] = await Promise.all([loadProjects(), loadClients()])
  const canEdit = session.role === "owner"

  return (
    <StudioAccess canEdit={canEdit}>
      <StudioShell name={session.name} projects={projects} clients={clients} canEdit={canEdit}>
        {children}
      </StudioShell>
    </StudioAccess>
  )
}
