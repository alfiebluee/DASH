import { parse } from "chrono-node"
import { format } from "date-fns"
import type { EventKind, Project } from "../data/schemas.ts"
import { shortDate } from "./dates.ts"

const KINDS: Array<{ word: string; kind: EventKind }> = [
  { word: "launch", kind: "Launch" },
  { word: "meeting", kind: "Meeting" },
  { word: "deadline", kind: "Deadline" },
  { word: "pitch", kind: "Pitch" },
  { word: "away", kind: "Away" },
  { word: "reminder", kind: "Reminder" },
]

export interface QuickAdd {
  title: string
  date: string
  kind: EventKind
  projectId?: string
  projectName?: string
  line: string
}

export function parseQuickAdd(input: string, projects: Project[], now: Date): QuickAdd | null {
  const text = input.trim()
  if (text.length < 3) return null
  const results = parse(text, now, { forwardDate: true })
  const match = results[0]
  if (!match) return null
  const when = match.start.date()
  const date = format(when, "yyyy-MM-dd")
  const lower = text.toLowerCase()
  const kind = KINDS.find((item) => lower.includes(item.word))?.kind ?? "Reminder"
  const project = [...projects]
    .filter((item) => !item.archived)
    .sort((a, b) => b.name.length - a.name.length)
    .find((item) => lower.includes(item.name.toLowerCase()) || matchesFirstWord(lower, item.name))
  const title = cleanupTitle(text, match.text, project?.name, kind)
  if (!title) return null
  const projectName = project?.name
  const line = [kind, projectName, shortDate(date)].filter(Boolean).join(" · ")
  return { title, date, kind, projectId: project?.id, projectName, line: `${line} — ${title}` }
}

function matchesFirstWord(input: string, name: string): boolean {
  const first = name.split(" ")[0]?.toLowerCase()
  if (!first || first.length < 3) return false
  return new RegExp(`\\b${escapeRegExp(first)}\\b`, "i").test(input)
}

function cleanupTitle(input: string, dateText: string, projectName: string | undefined, kind: EventKind): string {
  let title = input
  if (dateText) title = title.replace(dateText, " ")
  if (projectName) title = title.replace(new RegExp(escapeRegExp(projectName), "i"), " ")
  const first = projectName?.split(" ")[0]
  if (first && first.length >= 3) title = title.replace(new RegExp(`\\b${escapeRegExp(first)}\\b`, "i"), " ")
  title = title.replace(new RegExp(`\\b${kind}\\b`, "i"), " ")
  title = title.replace(/\b(at|on)\b/gi, " ").replace(/\s+/g, " ").trim()
  if (title.length > 0) return title.slice(0, 120)
  return projectName ? `${projectName} ${kind.toLowerCase()}` : kind
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
