"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { updateProjectDates } from "@/app/(studio)/studio/projects/actions"
import { useToast } from "@/components/toast-provider"
import { addDays, diffDays, formatShort, mondayOf } from "@/lib/dates"
import type { ProjectCard, SettingsRecord } from "@/lib/records"

const daysInView = 42

export function TimelineBoard({
  projects,
  settings,
  today,
}: {
  projects: ProjectCard[]
  settings: SettingsRecord
  today: string
}) {
  const start = mondayOf(today)
  const dated = projects.filter((project) => project.due_date || project.start_date)
  const weeks = [0, 1, 2, 3, 4, 5].map((week) => addDays(start, week * 7))
  const toast = useToast()
  const router = useRouter()
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  function left(iso: string) {
    return Math.min(100, Math.max(0, (diffDays(iso, start) / daysInView) * 100))
  }

  async function saveDue(project: ProjectCard, due: string) {
    const result = await updateProjectDates(project.id, { due_date: due })
    toast(result.message)
    if (!result.ok) setDrafts((current) => {
      const next = { ...current }
      delete next[project.id]
      return next
    })
    else router.refresh()
  }

  return (
    <section data-testid="timeline" className="rounded-[28px] bg-surface p-4 shadow-[var(--shadow)] sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-medium">Next six weeks</h2>
          <p className="text-[13px] text-ink-3">Drag an end to move a deadline.</p>
        </div>
        <Link href="/studio/settings#away" className="rounded-full bg-column px-3 py-2 text-[13px] text-ink">
          {settings.away_from ? `Away from ${formatShort(settings.away_from)}` : "Set away"}
        </Link>
      </div>
      <div className="relative overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-6 text-[12px] uppercase tracking-[0.08em] text-ink-3">
            {weeks.map((week) => (
              <p key={week}>{formatShort(week)}</p>
            ))}
          </div>
          <div className="relative mt-3 grid gap-3">
            {settings.away_from && settings.away_until ? (
              <div
                className="pointer-events-none absolute inset-y-0 rounded-xl bg-brand/10"
                style={{ left: `${left(settings.away_from)}%`, width: `${Math.max(left(settings.away_until) - left(settings.away_from), 1)}%` }}
              />
            ) : null}
            {dated.length === 0 ? <p className="text-[14px] text-ink-2">No deadlines in this window.</p> : null}
            {dated.map((project) => {
              const due = drafts[project.id] ?? project.due_date
              if (!due) return null
              return (
                <div key={project.id} className="relative h-10">
                  <p className="absolute left-0 top-0 w-28 truncate text-[13px] text-ink">{project.name}</p>
                  <div
                    className="absolute top-1 h-7 rounded-full bg-brand-tint"
                    style={{ left: `calc(7rem + ${left(project.start_date && project.start_date < due ? project.start_date : due)}%)`, width: "12px" }}
                  />
                  <button
                    type="button"
                    aria-label={`Move ${project.name} deadline`}
                    className="absolute top-0 h-9 w-4 rounded-full bg-brand"
                    style={{ left: `calc(7rem + ${left(due)}%)` }}
                    onPointerDown={(event) => {
                      const track = event.currentTarget.parentElement
                      if (!track) return
                      const pointer = event.pointerId
                      event.currentTarget.setPointerCapture(pointer)
                      const move = (moveEvent: PointerEvent) => {
                        const rect = track.getBoundingClientRect()
                        const ratio = Math.min(1, Math.max(0, (moveEvent.clientX - rect.left - 112) / Math.max(rect.width - 112, 1)))
                        const next = addDays(start, Math.round(ratio * (daysInView - 1)))
                        setDrafts((current) => ({ ...current, [project.id]: next }))
                      }
                      const up = (upEvent: PointerEvent) => {
                        track.removeEventListener("pointermove", move)
                        track.removeEventListener("pointerup", up)
                        const rect = track.getBoundingClientRect()
                        const ratio = Math.min(1, Math.max(0, (upEvent.clientX - rect.left - 112) / Math.max(rect.width - 112, 1)))
                        const next = addDays(start, Math.round(ratio * (daysInView - 1)))
                        void saveDue(project, next)
                      }
                      track.addEventListener("pointermove", move)
                      track.addEventListener("pointerup", up)
                    }}
                  />
                  <span className="absolute top-2 text-[12px] text-ink-2" style={{ left: `calc(8rem + ${left(due)}%)` }}>
                    {formatShort(due)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
