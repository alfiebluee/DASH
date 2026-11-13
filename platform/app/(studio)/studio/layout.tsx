import { redirect } from "next/navigation"

import { StudioShell } from "@/components/StudioShell"
import { loadClients, loadProjects } from "@/lib/data"
import { getSession } from "@/lib/session"

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect("/login")
  if (session.role !== "owner") redirect("/portal")
  const [projects, clients] = await Promise.all([loadProjects(), loadClients()])

  return (
    <StudioShell name={session.name} projects={projects} clients={clients}>
      {children}
    </StudioShell>
  )
}
