"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { moveProjectStage } from "@/app/(studio)/studio/projects/actions"
import { CreateProjectForm } from "@/components/create-project-form"
import { useToast } from "@/components/toast-provider"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/dialog"
import { formatDue, stageLabel, stages, type Stage } from "@/lib/labels"
import type { ClientRecord, ProjectCard } from "@/lib/records"

export function StageBoard({
  projects,
  clients,
  focusId,
}: {
  projects: ProjectCard[]
  clients: ClientRecord[]
  focusId: string | null
}) {
  const [items, setItems] = useState(projects)
  const [seen, setSeen] = useState(projects)
  const [creating, setCreating] = useState(false)
  const toast = useToast()
  const router = useRouter()
  if (seen !== projects) {
    setSeen(projects)
    setItems(projects)
  }

  async function move(id: string, stage: Stage) {
    const current = items.find((item) => item.id === id)
    if (!current || current.stage === stage) return
    const previous = items
    setItems(items.map((item) => (item.id === id ? { ...item, stage } : item)))
    const result = await moveProjectStage(id, stage)
    toast(result.message)
    if (!result.ok) setItems(previous)
    else router.refresh()
  }

  return (
    <section className="rounded-[28px] bg-surface p-4 shadow-[var(--shadow)] sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-medium">Stages</h2>
          <p className="text-[13px] text-ink-3">{items.length} projects · drag a card to move it</p>
        </div>
        <Button type="button" onClick={() => setCreating(true)}>
          New
        </Button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {stages.map((stage) => (
          <div
            key={stage}
            className="min-w-[150px] flex-1 rounded-[22px] bg-column p-2"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              const id = event.dataTransfer.getData("text/plain")
              if (id) void move(id, stage)
            }}
          >
            <p className="px-2 py-2 text-[11px] uppercase tracking-[0.12em] text-ink-3">
              {stageLabel(stage)} {items.filter((item) => item.stage === stage).length}
            </p>
            <div className="grid gap-2">
              {items
                .filter((item) => item.stage === stage)
                .map((project) => (
                  <article
                    key={project.id}
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData("text/plain", project.id)}
                    className={`rounded-[18px] bg-surface p-3 shadow-[var(--shadow)] ${focusId === project.id ? "ring-2 ring-brand" : ""}`}
                  >
                    <Link href={`/studio?focus=${project.id}`} className="text-[14px] font-medium text-ink">
                      {project.name}
                    </Link>
                    <p className="mt-1 text-[12px] text-ink-3">{project.type || project.client_name}</p>
                    <p className="mt-2 text-[12px] text-ink-2">{formatDue(project.due_date, project.status)}</p>
                    <Link href={`/studio/projects/${project.id}`} className="mt-2 inline-block text-[12px] text-brand">
                      Open
                    </Link>
                  </article>
                ))}
            </div>
          </div>
        ))}
      </div>
      <Modal open={creating} onOpenChange={setCreating} title="New project" description="The project is saved to the studio.">
        <CreateProjectForm clients={clients} onDone={() => setCreating(false)} />
      </Modal>
    </section>
  )
}
