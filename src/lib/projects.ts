import type { Project, StudioEvent } from "../data/schemas.ts"
import { dayIso, shortDate } from "./dates.ts"

export function isInMotion(project: Project): boolean {
  return !project.archived && project.stage !== "Pipeline" && project.stage !== "Live"
}

export function isAtRisk(project: Project): boolean {
  return project.status === "At risk" || project.status === "Blocked"
}

export function visibleProjects(projects: Project[]): Project[] {
  return projects.filter((project) => !project.archived)
}

export interface DueChip {
  label: string
  overdue: boolean
}

export function dueChip(project: Project, events: StudioEvent[], today: Date): DueChip {
  const todayIso = dayIso(today)
  if (project.dueDate) {
    const overdue = project.dueDate < todayIso && project.stage !== "Live"
    return {
      label: overdue ? "Overdue" : `Due ${shortDate(project.dueDate)}`,
      overdue,
    }
  }
  if (project.stage === "Live") return { label: "Ongoing", overdue: false }
  const next = nextEvent(project.id, events)
  if (next) {
    return { label: `Due ${shortDate(next.date)}`, overdue: next.date < todayIso }
  }
  return { label: "Ongoing", overdue: false }
}

export function nextEvent(projectId: string, events: StudioEvent[]): StudioEvent | undefined {
  return events
    .filter((event) => event.projectId === projectId && !event.done && event.kind !== "Away")
    .sort((a, b) => a.date.localeCompare(b.date))[0]
}
