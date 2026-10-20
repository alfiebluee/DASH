import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns"
import type { EventKind, Project, StudioEvent, TimelineWeeks } from "../data/schemas.ts"
import { milestonePhrase } from "../data/seed.ts"
import { dayIso, shortDate, weekStartMonday } from "./dates.ts"

export interface TimelineBar {
  left: number
  width: number
  clippedLeft: boolean
  clippedRight: boolean
  label: string
}

export interface TimelineMarker {
  id: string
  left: number
  kind: EventKind
  label: string
  showLabel: boolean
}

export interface TimelineRowModel {
  project: Project
  bar: TimelineBar | null
  markers: TimelineMarker[]
}

export interface TimelineModel {
  windowStart: Date
  windowEnd: Date
  totalDays: number
  columns: Date[]
  todayFraction: number
  rows: TimelineRowModel[]
  offscreen: { label: string; date: string } | null
}

export function timelineWindow(today: Date, weeks: TimelineWeeks): {
  windowStart: Date
  windowEnd: Date
  totalDays: number
  columns: Date[]
} {
  const windowStart = weekStartMonday(today)
  const totalDays = weeks * 7
  const windowEnd = addDays(windowStart, totalDays)
  const columns = Array.from({ length: weeks }, (_, index) => addDays(windowStart, index * 7))
  return { windowStart, windowEnd, totalDays, columns }
}

export function clipSpan(
  startIso: string | null,
  dueIso: string,
  windowStart: Date,
  totalDays: number,
): Omit<TimelineBar, "label"> | null {
  const due = parseISO(dueIso)
  const start = startIso ? parseISO(startIso) : windowStart
  let startFraction = differenceInCalendarDays(start, windowStart) / totalDays
  let endFraction = differenceInCalendarDays(due, windowStart) / totalDays
  if (endFraction <= 0 || startFraction >= 1) return null
  const clippedLeft = startFraction < 0
  const clippedRight = endFraction > 1
  startFraction = clamp(startFraction, 0, 1)
  endFraction = clamp(endFraction, 0, 1)
  return {
    left: startFraction,
    width: Math.max(endFraction - startFraction, 0.012),
    clippedLeft,
    clippedRight,
  }
}

export function buildTimeline(
  projects: Project[],
  events: StudioEvent[],
  today: Date,
  weeks: TimelineWeeks,
  extendTo?: string | null,
): TimelineModel {
  const window = extendedWindow(today, weeks, extendTo)
  const todayFraction = clamp(differenceInCalendarDays(startOfDaySafe(today), window.windowStart) / window.totalDays, 0, 1)
  const rows = projects
    .filter((project) => !project.archived)
    .map((project) => rowFor(project, events, window.windowStart, window.windowEnd, window.totalDays))
    .filter((row): row is TimelineRowModel => row !== null)
    .sort((a, b) => rowSortKey(a, events).localeCompare(rowSortKey(b, events)))

  return {
    ...window,
    todayFraction,
    rows,
    offscreen: offscreenChip(events, window.windowEnd),
  }
}

function rowFor(
  project: Project,
  events: StudioEvent[],
  windowStart: Date,
  windowEnd: Date,
  totalDays: number,
): TimelineRowModel | null {
  const barSpan = project.dueDate ? clipSpan(project.startDate, project.dueDate, windowStart, totalDays) : null
  const bar = barSpan
    ? {
        ...barSpan,
        label: `${milestonePhrase(project)} ${shortDate(project.dueDate ?? dayIso(windowStart))}`,
      }
    : null
  const markers = markersFor(project, events, windowStart, windowEnd, totalDays, Boolean(bar))
  if (!bar && markers.length === 0) return null
  return { project, bar, markers }
}

function markersFor(
  project: Project,
  events: StudioEvent[],
  windowStart: Date,
  windowEnd: Date,
  totalDays: number,
  hasBar: boolean,
): TimelineMarker[] {
  const startIso = dayIso(windowStart)
  const endIso = dayIso(windowEnd)
  return events
    .filter((event) => event.projectId === project.id && !event.done && event.kind !== "Away")
    .filter((event) => event.date !== project.dueDate)
    .filter((event) => event.date >= startIso && event.date < endIso)
    .map((event) => {
      const left = differenceInCalendarDays(parseISO(event.date), windowStart) / totalDays
      return {
        id: event.id,
        left,
        kind: event.kind,
        label: `${event.title} ${shortDate(event.date)}`,
        showLabel: !hasBar,
      }
    })
}

function rowSortKey(row: TimelineRowModel, events: StudioEvent[]): string {
  if (row.project.dueDate) return row.project.dueDate
  const marker = events.find((event) => event.projectId === row.project.id && !event.done)
  return marker?.date ?? "9999-99-99"
}

function offscreenChip(events: StudioEvent[], windowEnd: Date): { label: string; date: string } | null {
  const endIso = dayIso(windowEnd)
  const upcoming = events
    .filter((event) => !event.done && event.date >= endIso)
    .sort((a, b) => a.date.localeCompare(b.date))
  const first = upcoming[0]
  if (!first) return null
  const when = format(parseISO(first.date), "d MMM")
  if (first.kind === "Away") return { label: `Away from ${when}`, date: first.date }
  return { label: `${first.title} · ${when}`, date: first.date }
}

function extendedWindow(today: Date, weeks: TimelineWeeks, extendTo?: string | null) {
  const base = timelineWindow(today, weeks)
  if (!extendTo || extendTo < dayIso(base.windowEnd)) return base
  const needed = differenceInCalendarDays(parseISO(extendTo), base.windowStart) + 1
  const weekCount = Math.max(weeks, Math.ceil(needed / 7))
  const totalDays = weekCount * 7
  return {
    windowStart: base.windowStart,
    windowEnd: addDays(base.windowStart, totalDays),
    totalDays,
    columns: Array.from({ length: weekCount }, (_, index) => addDays(base.windowStart, index * 7)),
  }
}

function startOfDaySafe(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export interface PhoneAgendaGroup {
  date: string
  items: Array<{ id: string; title: string; meta: string; projectId: string }>
}

export function phoneAgenda(model: TimelineModel, events: StudioEvent[]): PhoneAgendaGroup[] {
  const groups = new Map<string, PhoneAgendaGroup>()
  const startIso = dayIso(model.windowStart)
  const endIso = dayIso(model.windowEnd)
  for (const row of model.rows) {
    const due = row.project.dueDate
    if (due && due >= startIso && due < endIso) {
      pushGroup(groups, due, {
        id: `${row.project.id}-due`,
        title: row.bar?.label ?? row.project.name,
        meta: row.project.name,
        projectId: row.project.id,
      })
    }
    for (const marker of row.markers) {
      const event = events.find((item) => item.id === marker.id)
      if (!event) continue
      pushGroup(groups, event.date, {
        id: marker.id,
        title: event.title,
        meta: event.kind,
        projectId: row.project.id,
      })
    }
  }
  return [...groups.values()].sort((a, b) => a.date.localeCompare(b.date))
}

function pushGroup(groups: Map<string, PhoneAgendaGroup>, date: string, item: PhoneAgendaGroup["items"][number]): void {
  const current = groups.get(date) ?? { date, items: [] }
  current.items.push(item)
  groups.set(date, current)
}
