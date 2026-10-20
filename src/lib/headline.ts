import type { Project } from "../data/schemas.ts"
import { countWord, daysFromToday, smallNumberWord } from "./dates.ts"
import { isAtRisk, isInMotion } from "./projects.ts"

export interface MotionHeadline {
  count: number
  countLabel: string
  projectWord: string
  nearest: Project | null
  days: number | null
  nudge: Project | null
  when: string | null
}

export function motionHeadline(projects: Project[], today: Date): MotionHeadline {
  const active = projects.filter(isInMotion)
  const dated = active
    .filter((project) => project.dueDate)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
  const nearest = dated[0] ?? null
  const nudge = active.find((project) => isAtRisk(project)) ?? null
  const days = nearest?.dueDate ? daysFromToday(nearest.dueDate, today) : null
  return {
    count: active.length,
    countLabel: countWord(active.length),
    projectWord: active.length === 1 ? "project" : "projects",
    nearest,
    days,
    nudge,
    when: whenPhrase(days),
  }
}

function whenPhrase(days: number | null): string | null {
  if (days === null) return null
  if (days === 0) return "today"
  if (days === 1) return "in one day"
  if (days > 1) return `in ${smallNumberWord(days)} days`
  if (days === -1) return "one day ago"
  return `${smallNumberWord(Math.abs(days))} days ago`
}
