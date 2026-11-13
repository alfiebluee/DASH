import { SignOut } from "@/components/SignOut"
import { StudioNav } from "@/components/StudioNav"
import { CommandPalette } from "@/components/command-palette"
import { ViewSwitch } from "@/components/view-switch"
import type { ClientRecord, ProjectCard } from "@/lib/records"

export function StudioShell({
  name,
  projects,
  clients,
  children,
}: {
  name: string
  projects: ProjectCard[]
  clients: ClientRecord[]
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto grid min-h-screen w-full min-w-0 max-w-[1280px] grid-cols-1 gap-6 px-4 py-4 md:grid-cols-[220px_minmax(0,1fr)] md:px-6 md:py-6">
      <header className="md:sticky md:top-6 md:self-start">
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink-3">Studio</p>
        <p className="mt-3 text-[15px] text-ink">{name}</p>
        <StudioNav />
        <div className="mt-6">
          <SignOut />
        </div>
      </header>
      <div className="min-w-0">
        <div className="mb-6 flex flex-wrap items-center justify-end gap-2">
          <ViewSwitch />
          <CommandPalette projects={projects} clients={clients} />
        </div>
        {children}
      </div>
    </div>
  )
}
