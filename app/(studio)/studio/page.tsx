import Link from "next/link"

import { DeliveryWatch } from "@/components/delivery-watch"
import { EmptyState } from "@/components/empty-state"
import { FocusCard } from "@/components/focus-card"
import { StageBoard } from "@/components/stage-board"
import { TimelineBoard } from "@/components/timeline-board"
import { loadClients, loadDeliveryWatch, loadProjects, loadSettings } from "@/lib/data"
import { londonToday } from "@/lib/dates"
import { selectFocus } from "@/lib/focus"
import { formatToday, greetingFor } from "@/lib/greeting"
import { getSession } from "@/lib/session"

export default async function StudioHome({ searchParams }: { searchParams: Promise<{ focus?: string }> }) {
  const params = await searchParams
  const session = await getSession()
  const [projects, clients, settings, watch] = await Promise.all([loadProjects(), loadClients(), loadSettings(), loadDeliveryWatch()])
  const open = projects.filter((project) => project.status !== "archived")
  const today = londonToday()
  const focus = selectFocus(open, today, params.focus)

  return (
    <main>
      <p className="text-[12px] uppercase tracking-[0.16em] text-ink-3">{formatToday(new Date())}</p>
      <h1 className="mt-2 text-[40px] font-light tracking-[-0.03em] text-ink">
        {greetingFor(new Date())}, {session?.name}
      </h1>
      {open.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No projects yet"
            body="Create a client and a project. They show up here, on the board, and in the list."
            action={
              <Link href="/studio/projects" className="rounded-full bg-brand px-4 py-2 text-[14px] text-surface">
                Create a project
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-4">
          {focus ? <FocusCard project={focus} today={today} /> : null}
          <StageBoard projects={open} clients={clients} focusId={focus?.id ?? null} />
          <TimelineBoard projects={open} settings={settings} today={today} />
        </div>
      )}
      <div className="mt-4">
        <DeliveryWatch late={watch.late} due={watch.due} />
      </div>
    </main>
  )
}
