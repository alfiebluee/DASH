import { addDays, format } from "date-fns"
import { Star } from "lucide-react"
import { useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react"
import { TIMELINE_WEEKS, type EventKind, type Project, type StudioEvent, type TimelineWeeks } from "../../data/schemas.ts"
import { buildTimeline, clipSpan, phoneAgenda } from "../../lib/timeline.ts"
import { dayIso, shiftIso, shortDate, smallNumberWord, weekStartMonday } from "../../lib/dates.ts"
import { useCommands } from "../../lib/commands.ts"
import { undoToast } from "../../lib/mutations.ts"
import { swatch } from "../../styles/tokens.ts"
import { Card } from "../ui/Primitives.tsx"

export function Timeline({
  projects,
  events,
  weeks,
  now,
}: {
  projects: Project[]
  events: StudioEvent[]
  weeks: TimelineWeeks
  now: Date
}) {
  const commands = useCommands()
  const [preview, setPreview] = useState<Project[] | null>(null)
  const [dragLabel, setDragLabel] = useState<string | null>(null)
  const shown = preview ?? projects
  const model = buildTimeline(shown, events, now, weeks, commands.ui.timelineUntil)
  const groups = phoneAgenda(model, events)
  const away = events.find((event) => event.kind === "Away" && !event.done)
  const awaySpan = away ? clipSpan(away.date, away.endDate ?? away.date, model.windowStart, model.totalDays) : null

  function commitProject(project: Project, patch: { startDate?: string | null; dueDate?: string | null }, message: string) {
    const before = { startDate: project.startDate, dueDate: project.dueDate }
    void commands.saveProject(project.id, patch).then(() => {
      undoToast(message, () => commands.saveProject(project.id, before))
    })
  }

  function shiftProject(project: Project, edge: "start" | "due" | "body", days: number) {
    if (days === 0) return
    if (edge === "due" && project.dueDate) {
      const dueDate = shiftIso(project.dueDate, days)
      commitProject(project, { dueDate }, `Due ${shortDate(dueDate)}`)
    }
    if (edge === "start" && project.startDate) {
      const startDate = shiftIso(project.startDate, days)
      commitProject(project, { startDate }, `Starts ${shortDate(startDate)}`)
    }
    if (edge === "body" && project.dueDate) {
      const dueDate = shiftIso(project.dueDate, days)
      const startDate = project.startDate ? shiftIso(project.startDate, days) : null
      commitProject(project, { startDate, dueDate }, `Moved to ${shortDate(dueDate)}`)
    }
  }

  function beginProjectDrag(event: ReactPointerEvent, project: Project, edge: "start" | "due" | "body") {
    const track = event.currentTarget.closest("[data-track]")
    if (!(track instanceof HTMLElement)) return
    event.preventDefault()
    event.stopPropagation()
    const width = track.getBoundingClientRect().width
    const origin = event.clientX
    const source = projects.find((item) => item.id === project.id) ?? project
    function daysFrom(clientX: number) {
      return Math.round(((clientX - origin) / width) * model.totalDays)
    }
    function move(pointer: PointerEvent) {
      const days = daysFrom(pointer.clientX)
      if (days === 0) {
        setPreview(null)
        setDragLabel(null)
        return
      }
      const next = shifted(source, edge, days)
      setPreview(projects.map((item) => (item.id === source.id ? next : item)))
      const shownDate = edge === "start" ? next.startDate : next.dueDate
      setDragLabel(shownDate ? shortDate(shownDate) : null)
    }
    function up(pointer: PointerEvent) {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      const days = daysFrom(pointer.clientX)
      setPreview(null)
      setDragLabel(null)
      if (Math.abs(pointer.clientX - origin) < 4 && days === 0) {
        commands.ui.openProject(source.id)
        return
      }
      shiftProject(source, edge, days)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }

  function beginEventDrag(event: ReactPointerEvent, item: StudioEvent) {
    const closestTrack = event.currentTarget.closest("[data-track]")
    const track = closestTrack instanceof HTMLElement ? closestTrack : document.querySelector("[data-track]")
    if (!(track instanceof HTMLElement)) return
    event.preventDefault()
    event.stopPropagation()
    const width = track.getBoundingClientRect().width
    const origin = event.clientX
    let lastDays = 0
    function move(pointer: PointerEvent) {
      lastDays = Math.round(((pointer.clientX - origin) / width) * model.totalDays)
      setDragLabel(lastDays === 0 ? null : shortDate(shiftIso(item.date, lastDays)))
    }
    function up(pointer: PointerEvent) {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      const days = Math.round(((pointer.clientX - origin) / width) * model.totalDays)
      setDragLabel(null)
      if (Math.abs(pointer.clientX - origin) < 4 && days === 0) {
        commands.ui.openEvent(item.id)
        return
      }
      if (days === 0) return
      const date = shiftIso(item.date, days)
      const endDate = item.endDate ? shiftIso(item.endDate, days) : undefined
      void commands.mutations.updateEvent.mutateAsync({ id: item.id, patch: { date, endDate } }).then(() => {
        undoToast(`Moved to ${shortDate(date)}`, () =>
          commands.mutations.updateEvent.mutateAsync({ id: item.id, patch: { date: item.date, endDate: item.endDate } }),
        )
      })
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }

  return (
    <Card id="timeline" className={`p-4 sm:p-5 ${commands.ui.highlightWeek ? "ring-2 ring-turquoise" : ""}`}>
      <div data-highlighted={commands.ui.highlightWeek ? "true" : "false"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-medium tracking-tight">Next {smallNumberWord(weeks)} weeks</h2>
          <p className="text-[12px] text-ink-3">{dragLabel ?? "Drag an end to move a deadline"}</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[12px] text-ink-3">
            <span className="sr-only">Timeline length</span>
            <select
              aria-label="Timeline length"
              className="rounded-full border border-line bg-white px-3 py-1.5 text-[12px] text-ink"
              value={weeks}
              onChange={(event) => {
                const value = Number(event.target.value)
                if (value === 4 || value === 6 || value === 8) {
                  void commands.mutations.updateSettings.mutateAsync({ timelineWeeks: value })
                }
              }}
            >
              {TIMELINE_WEEKS.map((option) => (
                <option key={option} value={option}>
                  {option} weeks
                </option>
              ))}
            </select>
          </label>
          {model.offscreen ? (
            <button
              type="button"
              className="shrink-0 rounded-full border border-line bg-white px-3 py-1.5 text-[12px] text-ink-2"
              onClick={() => commands.ui.setTimelineUntil(model.offscreen?.date ?? null)}
            >
              {model.offscreen.label} →
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-5 hidden md:block">
        <div className="flex">
          <div className="w-[148px] shrink-0" />
          <div className="relative h-5 flex-1">
            {model.columns.map((column, index) => (
              <span
                key={column.toISOString()}
                className="absolute -translate-x-0 text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3"
                style={{ left: `${(index / model.columns.length) * 100}%` }}
              >
                {format(column, "d MMM")}
              </span>
            ))}
          </div>
        </div>
        <div className="relative mt-2">
          {model.rows.map((row) => {
            const colours = swatch(row.project.colour)
            const dueHot = commands.ui.highlightWeek && row.project.dueDate ? inThisWeek(row.project.dueDate, now) : false
            return (
              <div key={row.project.id} className="flex h-11 items-center" data-highlighted={dueHot ? "true" : "false"}>
                <div className="flex w-[148px] shrink-0 items-center gap-2 pr-3">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colours.accent }} aria-hidden="true" />
                  <button type="button" className="truncate text-left text-[12px] text-ink-2" onClick={() => commands.ui.openProject(row.project.id)}>
                    {row.project.name}
                  </button>
                </div>
                <div className="relative h-full flex-1" data-track>
                  {row.bar ? (
                    <div
                      className="absolute top-1/2 flex h-[22px] -translate-y-1/2 items-center"
                      style={{
                        left: `${row.bar.left * 100}%`,
                        width: `${row.bar.width * 100}%`,
                        background: colours.tint,
                        borderRadius: radius(row.bar.clippedLeft, row.bar.clippedRight),
                        outline: dueHot ? "2px solid #22C3C9" : undefined,
                      }}
                    >
                      {row.project.startDate ? (
                        <button
                          type="button"
                          aria-label={`Start date for ${row.project.name}`}
                          className="absolute -left-1 top-0 h-full w-3 cursor-ew-resize"
                          onPointerDown={(event) => beginProjectDrag(event, row.project, "start")}
                          onClick={() => commands.ui.openProject(row.project.id)}
                          onKeyDown={(event) => nudge(event, () => shiftProject(row.project, "start", event.key === "ArrowRight" ? 1 : -1))}
                        />
                      ) : null}
                      <button
                        type="button"
                        className="w-full truncate px-2.5 pr-4 text-right text-[11px] text-ink"
                        aria-label={`Move ${row.project.name}`}
                        onPointerDown={(event) => beginProjectDrag(event, row.project, "body")}
                        onClick={() => commands.ui.openProject(row.project.id)}
                      >
                        {row.bar.label}
                      </button>
                      {row.project.dueDate ? (
                        <button
                          type="button"
                          aria-label={`Due date for ${row.project.name}`}
                          className="absolute -right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 cursor-ew-resize rounded-full ring-2 ring-white"
                          style={{ background: colours.accent }}
                          onPointerDown={(event) => beginProjectDrag(event, row.project, "due")}
                          onClick={() => commands.ui.openProject(row.project.id)}
                          onKeyDown={(event) => nudge(event, () => shiftProject(row.project, "due", event.key === "ArrowRight" ? 1 : -1))}
                        />
                      ) : null}
                    </div>
                  ) : null}
                  {row.markers.map((marker) => {
                    const item = events.find((event) => event.id === marker.id)
                    if (!item) return null
                    return (
                      <button
                        key={marker.id}
                        type="button"
                        aria-label={`${item.title}, ${shortDate(item.date)}`}
                        className={`absolute top-1/2 z-[1] -translate-x-1/2 -translate-y-1/2 ${commands.ui.highlightWeek && inThisWeek(item.date, now) ? "rounded-full ring-2 ring-turquoise" : ""}`}
                        style={{ left: `${marker.left * 100}%` }}
                        onPointerDown={(event) => beginEventDrag(event, item)}
                        onClick={() => commands.ui.openEvent(item.id)}
                        onKeyDown={(event) => {
                          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
                          event.preventDefault()
                          const date = shiftIso(item.date, event.key === "ArrowRight" ? 1 : -1)
                          void commands.mutations.updateEvent.mutateAsync({ id: item.id, patch: { date } }).then(() => {
                            undoToast(`Moved to ${shortDate(date)}`, () =>
                              commands.mutations.updateEvent.mutateAsync({ id: item.id, patch: { date: item.date } }),
                            )
                          })
                        }}
                      >
                        {marker.showLabel ? (
                          <span className="absolute right-full top-1/2 mr-2 -translate-y-1/2 whitespace-nowrap text-[11px] text-ink-2">
                            {marker.label}
                          </span>
                        ) : null}
                        <Marker kind={marker.kind} colour={colours.accent} />
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {away && awaySpan ? (
            <div className="pointer-events-none absolute inset-y-0 left-[148px] right-0">
              <button
                type="button"
                aria-label={`Away from ${shortDate(away.date)}`}
                className="pointer-events-auto absolute inset-y-0 cursor-ew-resize"
                style={{
                  left: `${awaySpan.left * 100}%`,
                  width: `${Math.max(awaySpan.width, 0.02) * 100}%`,
                  backgroundImage: "repeating-linear-gradient(135deg, transparent, transparent 4px, rgba(14,116,144,0.18) 4px, rgba(14,116,144,0.18) 8px)",
                }}
                onPointerDown={(event) => beginEventDrag(event, away)}
                onClick={() => commands.ui.openEvent(away.id)}
              />
            </div>
          ) : null}
          <div className="pointer-events-none absolute inset-y-0 left-[148px] right-0">
            {model.columns.map((column, index) => (
              <span key={`line-${column.toISOString()}`} className="absolute inset-y-0 w-px bg-line" style={{ left: `${(index / model.columns.length) * 100}%` }} />
            ))}
            <span className="absolute inset-y-0 w-px bg-turquoise" style={{ left: `${model.todayFraction * 100}%` }}>
              <span className="absolute -left-[3px] -top-1 h-1.5 w-1.5 rounded-full bg-turquoise" />
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-4 md:hidden">
        {groups.map((group) => (
          <section key={group.date}>
            <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">{shortDate(group.date)}</h3>
            <ul className="mt-2 space-y-2">
              {group.items.map((item) => {
                const project = projects.find((entry) => entry.id === item.projectId)
                const colours = project ? swatch(project.colour) : { accent: "#5B6B75", tint: "#EBF2F4" }
                const event = events.find((entry) => entry.id === item.id)
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 rounded-2xl bg-surface-muted px-3 py-2 text-left"
                      onClick={() => (event ? commands.ui.openEvent(event.id) : commands.ui.openProject(item.projectId))}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ background: colours.accent }} aria-hidden="true" />
                      <span>
                        <span className="block text-[13px] text-ink">{item.title}</span>
                        <span className="block text-[11px] text-ink-3">{item.meta}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
      </div>
    </Card>
  )
}

function shifted(project: Project, edge: "start" | "due" | "body", days: number): Project {
  if (edge === "due" && project.dueDate) return { ...project, dueDate: shiftIso(project.dueDate, days) }
  if (edge === "start" && project.startDate) return { ...project, startDate: shiftIso(project.startDate, days) }
  if (edge === "body" && project.dueDate) {
    return {
      ...project,
      dueDate: shiftIso(project.dueDate, days),
      startDate: project.startDate ? shiftIso(project.startDate, days) : null,
    }
  }
  return project
}

function nudge(event: ReactKeyboardEvent, run: () => void) {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
  event.preventDefault()
  run()
}

function inThisWeek(iso: string, now: Date): boolean {
  const start = dayIso(weekStartMonday(now))
  const end = dayIso(addDays(weekStartMonday(now), 7))
  return iso >= start && iso < end
}

function radius(clippedLeft: boolean, clippedRight: boolean): string {
  if (clippedLeft && clippedRight) return "0"
  if (clippedLeft) return "0 999px 999px 0"
  if (clippedRight) return "999px 0 0 999px"
  return "999px"
}

function Marker({ kind, colour }: { kind: EventKind; colour: string }) {
  if (kind === "Meeting") {
    return <span className="block h-3 w-3 rounded-full border-2 bg-white" style={{ borderColor: colour }} aria-hidden="true" />
  }
  if (kind === "Deadline") {
    return <span className="block h-2.5 w-2.5 rounded-full" style={{ background: colour }} aria-hidden="true" />
  }
  if (kind === "Pitch") {
    return <span className="block h-2.5 w-2.5 rotate-45" style={{ background: colour }} aria-hidden="true" />
  }
  if (kind === "Launch") {
    return <Star className="h-3.5 w-3.5" style={{ color: colour, fill: colour }} aria-hidden="true" strokeWidth={1.5} />
  }
  return <span className="block h-2.5 w-2.5 rounded-sm" style={{ background: colour }} aria-hidden="true" />
}
