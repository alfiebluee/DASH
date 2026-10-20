import type { Project, StudioEvent } from "../data/schemas.ts"
import { duePresentationFor } from "../data/seed.ts"
import { swatch } from "../styles/tokens.ts"
import { dayIso } from "./dates.ts"

export interface UpNextItem {
  id: string
  date: string
  title: string
  detail: string
  tint: string
  accent: string
  overdue: boolean
  projectId?: string
  eventId?: string
}

export function upNext(projects: Project[], events: StudioEvent[], today: Date, limit = 6): UpNextItem[] {
  const todayIso = dayIso(today)
  const byId = new Map(projects.map((project) => [project.id, project]))
  const items: UpNextItem[] = []

  for (const event of events) {
    if (event.done || event.kind === "Away") continue
    const project = event.projectId ? byId.get(event.projectId) : undefined
    const colours = project ? swatch(project.colour) : { accent: "#5B6B75", tint: "#EBF2F4" }
    items.push({
      id: `event-${event.id}`,
      date: event.date,
      title: event.title,
      detail: event.kind,
      tint: colours.tint,
      accent: colours.accent,
      overdue: event.date < todayIso,
      projectId: event.projectId,
      eventId: event.id,
    })
  }

  for (const project of projects) {
    if (project.archived || !project.dueDate || project.stage === "Live") continue
    const covered = events.some((event) => event.projectId === project.id && event.date === project.dueDate && !event.done)
    if (covered) continue
    const colours = swatch(project.colour)
    const copy = duePresentationFor(project)
    items.push({
      id: `due-${project.id}`,
      date: project.dueDate,
      title: copy.title,
      detail: copy.detail,
      tint: colours.tint,
      accent: colours.accent,
      overdue: project.dueDate < todayIso,
      projectId: project.id,
    })
  }

  return items.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title)).slice(0, limit)
}
