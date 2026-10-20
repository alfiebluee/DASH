import type { Project } from "../data/schemas.ts"
import { daysFromToday, shortDate } from "./dates.ts"

export function selectFocus(projects: Project[], sessionId?: string | null): Project | null {
  const open = projects.filter((project) => !project.archived)
  if (sessionId) {
    const chosen = open.find((project) => project.id === sessionId)
    if (chosen) return chosen
  }
  const pinned = open.find((project) => project.pinned)
  if (pinned) return pinned
  const urgent = open
    .filter((project) => project.stage !== "Pipeline" && project.stage !== "Live")
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority
      const aDue = a.dueDate ?? "9999-99-99"
      const bDue = b.dueDate ?? "9999-99-99"
      if (aDue !== bDue) return aDue < bDue ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  return urgent[0] ?? null
}

export interface DeadlineReadout {
  figure: string
  caption: string
  numeric: number | null
}

export function deadlineReadout(project: Project, today: Date): DeadlineReadout {
  if (!project.dueDate) {
    if (project.stage === "Live") {
      return { figure: "Live", caption: "This project is live", numeric: null }
    }
    return { figure: "—", caption: "No deadline set", numeric: null }
  }
  const days = daysFromToday(project.dueDate, today)
  const when = shortDate(project.dueDate)
  if (days > 1) {
    return { figure: String(days), caption: `days to the next deadline · ${when}`, numeric: days }
  }
  if (days === 1) {
    return { figure: "1", caption: `day to the next deadline · ${when}`, numeric: 1 }
  }
  if (days === 0) {
    return { figure: "0", caption: `due today · ${when}`, numeric: 0 }
  }
  const overdue = Math.abs(days)
  return {
    figure: String(overdue),
    caption: overdue === 1 ? `day overdue · ${when}` : `days overdue · ${when}`,
    numeric: overdue,
  }
}
