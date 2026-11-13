"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

import type { ProjectCard } from "@/lib/records"

export function ProjectSwitcher({
  projects,
  currentId,
  tab,
}: {
  projects: ProjectCard[]
  currentId: string
  tab: string
}) {
  const router = useRouter()
  const ordered = [...projects].sort((a, b) => {
    if (a.updated_at !== b.updated_at) return a.updated_at < b.updated_at ? 1 : -1
    if (a.name !== b.name) return a.name < b.name ? -1 : 1
    return 0
  })
  const index = ordered.findIndex((project) => project.id === currentId)
  const previous = index > 0 ? ordered[index - 1] : null
  const next = index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null
  const query = tab === "overview" ? "" : `?tab=${tab}`

  return (
    <div className="flex flex-wrap items-center gap-3">
      {previous ? (
        <Link href={`/studio/projects/${previous.id}${query}`} className="text-[13px] text-ink-2">
          Previous
        </Link>
      ) : null}
      <label className="text-[13px] text-ink-2">
        Project
        <select
          className="ml-2"
          value={currentId}
          aria-label="Switch project"
          onChange={(event) => router.push(`/studio/projects/${event.target.value}${query}`)}
        >
          {ordered.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>
      {next ? (
        <Link href={`/studio/projects/${next.id}${query}`} className="text-[13px] text-ink-2">
          Next
        </Link>
      ) : null}
    </div>
  )
}
