import { diffDays } from "@/lib/dates"
import type { ProjectCard } from "@/lib/records"

export function selectFocus(projects: ProjectCard[], today: string, focusId?: string | null): ProjectCard | null {
  const open = projects.filter((project) => project.status !== "archived")
  if (focusId) {
    const chosen = open.find((project) => project.id === focusId)
    if (chosen) return chosen
  }
  const pinned = open.find((project) => project.pinned)
  if (pinned) return pinned
  const dated = open.filter((project) => project.due_date)
  const upcoming = dated
    .filter((project) => project.due_date && project.due_date >= today)
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))
  if (upcoming[0]) return upcoming[0]
  const overdue = dated.sort((a, b) => diffDays(b.due_date ?? today, a.due_date ?? today))
  return overdue[0] ?? open[0] ?? null
}
