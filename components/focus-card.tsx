"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { pinProject } from "@/app/(studio)/studio/projects/actions"
import { StageProgress } from "@/components/stage-progress"
import { useCanEdit } from "@/components/studio-access"
import { useToast } from "@/components/toast-provider"
import { deadlinePhrase } from "@/lib/dates"
import { statusLabel } from "@/lib/labels"
import type { ProjectCard } from "@/lib/records"

function nextAction(project: ProjectCard): { href: string; label: string } {
  if (project.stage === "pipeline" || project.stage === "brief") return { href: `/studio/projects/${project.id}?tab=documents`, label: "Add documents" }
  if (project.stage === "proposal" || project.stage === "set_design") return { href: `/studio/projects/${project.id}#approvals`, label: "Review approvals" }
  if (project.stage === "procurement") return { href: `/studio/projects/${project.id}?tab=materials`, label: "Open materials" }
  if (project.stage === "set_build") return { href: `/studio/projects/${project.id}`, label: "Open build" }
  return { href: `/studio/projects/${project.id}`, label: "Open project" }
}

export function FocusCard({ project, today }: { project: ProjectCard; today: string }) {
  const toast = useToast()
  const router = useRouter()
  const canEdit = useCanEdit()
  const [pending, setPending] = useState(false)
  const action = nextAction(project)
  const subtitle = [project.client_name, project.type].filter(Boolean).join(" · ")

  return (
    <section data-testid="focus-card" className="min-w-0 rounded-[28px] bg-focus p-6 shadow-[var(--shadow)] sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.16em] text-ink-3">Focus</p>
        <div className="flex items-center gap-3 text-[13px]">
          <span className="text-ink-2">{statusLabel(project.status)}</span>
          {canEdit ? <button
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
          </button> : null}
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
        <Link href={action.href} className="inline-flex rounded-full bg-surface px-4 py-2 text-[14px] text-ink shadow-[var(--shadow)]">
          {action.label}
        </Link>
      </div>
    </section>
  )
}
