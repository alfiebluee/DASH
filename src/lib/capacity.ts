import { addDays } from "date-fns"
import type { Project, StudioEvent } from "../data/schemas.ts"
import { dayIso, weekStartMonday } from "./dates.ts"
import { isAtRisk, isInMotion } from "./projects.ts"

export type CapacityTone = "turquoise" | "amber" | "coral"

export interface Capacity {
  used: number
  weekly: number
  ratio: number
  tone: CapacityTone
  active: number
}

function toneFor(ratio: number): CapacityTone {
  if (ratio > 1) return "coral"
  if (ratio >= 0.85) return "amber"
  return "turquoise"
}

export function capacityFor(projects: Project[], weeklyCapacityHours: number): Capacity {
  const activeProjects = projects.filter(isInMotion)
  const used = activeProjects.reduce((sum, project) => sum + project.hoursPerWeek, 0)
  const weekly = weeklyCapacityHours
  const ratio = weekly <= 0 ? 0 : used / weekly
  return { used, weekly, ratio, tone: toneFor(ratio), active: activeProjects.length }
}

export function atRiskCount(projects: Project[]): number {
  return projects.filter((project) => !project.archived && isAtRisk(project)).length
}

export function dueThisWeekCount(projects: Project[], events: StudioEvent[], today: Date): number {
  const start = weekStartMonday(today)
  const end = addDays(start, 6)
  const startIso = dayIso(start)
  const endIso = dayIso(end)
  const inWeek = (iso: string) => iso >= startIso && iso <= endIso
  const eventsInWeek = events.filter((event) => !event.done && event.kind !== "Away" && inWeek(event.date))
  const covered = new Set(
    eventsInWeek.flatMap((event) => (event.projectId ? [`${event.projectId}:${event.date}`] : [])),
  )
  const dues = projects.filter((project) => {
    if (project.archived || !project.dueDate || !inWeek(project.dueDate)) return false
    return !covered.has(`${project.id}:${project.dueDate}`)
  })
  return eventsInWeek.length + dues.length
}
