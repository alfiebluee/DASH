"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { moveProjectStage, pinProject } from "@/app/(studio)/studio/projects/actions"
import { StageProgress } from "@/components/stage-progress"
import { useToast } from "@/components/toast-provider"
import { Button } from "@/components/ui/button"
import { deadlinePhrase } from "@/lib/dates"
import { statusLabel, type Stage } from "@/lib/labels"
import type { ProjectCard } from "@/lib/records"

function nextAction(project: ProjectCard): { href?: string; stage?: Stage; label: string; confirm?: string } {
  if (project.stage === "pipeline") return { href: `/studio/projects/${project.id}?tab=documents`, label: "Add proposal" }
  if (project.stage === "brief") return { href: `/studio/projects/${project.id}?tab=documents`, label: "Add scope of work" }
  if (project.stage === "design") return { href: `/studio/projects/${project.id}?tab=documents`, label: "Add set design" }
  if (project.stage === "build") return { stage: "review", label: "Mark build finished", confirm: "Move this project to Review?" }
  if (project.stage === "review") return { href: `/studio/projects/${project.id}?tab=documents`, label: "Open review" }
  return { href: `/studio/projects/${project.id}`, label: "Open project" }
}

export function FocusCard({ project, today }: { project: ProjectCard; today: string }) {
  const toast = useToast()
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const action = nextAction(project)
  const subtitle = [project.client_name, project.type].filter(Boolean).join(" · ")

  return (
    <section data-testid="focus-card" className="rounded-[28px] bg-focus p-6 shadow-[var(--shadow)] sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.16em] text-ink-3">Focus</p>
        <div className="flex items-center gap-3 text-[13px]">
          <span className="text-ink-2">{statusLabel(project.status)}</span>
          <button
            type="button"
            className="text-ink"
            disabled={pending}
            onClick={async () => {
              setPending(true)
              const result = await pinProject(project.id, !project.pinned)
              setPending(false)
              toast(result.message)
              if (result.ok) router.refresh()
            }}
          >
            {project.pinned ? "Unpin" : "Pin"}
          </button>
        </div>
      </div>
      <h2 className="mt-3 text-[32px] font-normal tracking-[-0.03em]">{project.name}</h2>
      {subtitle ? <p className="mt-1 text-[14px] text-ink-2">{subtitle}</p> : null}
      <p className="mt-6 text-[15px] text-ink">
        {project.due_date ? deadlinePhrase(project.due_date, today) : "Ongoing · no end date"}
      </p>
      <div className="mt-4">
        <StageProgress stage={project.stage} />
      </div>
      <div className="mt-6">
        {action.href ? (
          <Link href={action.href} className="inline-flex rounded-full bg-surface px-4 py-2 text-[14px] text-ink shadow-[var(--shadow)]">
            {action.label}
          </Link>
        ) : (
          <Button
            type="button"
            tone="surface"
            disabled={pending}
            onClick={async () => {
              if (!action.stage || !window.confirm(action.confirm ?? "Move this project?")) return
              setPending(true)
              const result = await moveProjectStage(project.id, action.stage)
              setPending(false)
              toast(result.message)
              if (result.ok) router.refresh()
            }}
          >
            {action.label}
          </Button>
        )}
      </div>
    </section>
  )
}
