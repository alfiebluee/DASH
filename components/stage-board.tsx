"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { moveProjectStage } from "@/app/(studio)/studio/projects/actions"
import { CreateProjectForm } from "@/components/create-project-form"
import { StageGateDialog } from "@/components/stage-gate-dialog"
import { useToast } from "@/components/toast-provider"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/dialog"
import { stageLabel, stages, type Stage } from "@/lib/labels"
import type { ClientRecord, ProjectCard } from "@/lib/records"
import { awaitingLabel, blockingApprovals, daysInStageLabel, type GateApproval } from "@/lib/stages"

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
  const [drag, setDrag] = useState<{ id: string; stage: Stage; pending: GateApproval[] } | null>(null)
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const router = useRouter()
  if (seen !== projects) {
    setSeen(projects)
    setItems(projects)
  }

  async function commit(id: string, stage: Stage, choice: "move" | "approve") {
    const current = items.find((item) => item.id === id)
    if (!current || current.stage === stage) return
    const previous = items
    setItems(items.map((item) => (item.id === id ? { ...item, stage, stage_entered_at: new Date().toISOString() } : item)))
    setBusy(true)
    const result = await moveProjectStage(id, stage, choice)
    setBusy(false)
    toast(result.message)
    if (!result.ok) setItems(previous)
    else {
      setDrag(null)
      router.refresh()
    }
  }

  function move(id: string, stage: Stage) {
    const current = items.find((item) => item.id === id)
    if (!current || current.stage === stage) return
    const pending = blockingApprovals(current.stage, stage, current.gates)
    if (pending.length > 0) {
      setDrag({ id, stage, pending })
      return
    }
    void commit(id, stage, "move")
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
            className="min-w-[180px] flex-1 rounded-[22px] bg-column p-2"
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
                    <p className="text-[12px] text-ink-3">{project.client_name}</p>
                    <Link href={`/studio/projects/${project.id}`} className="mt-1 block text-[14px] font-medium text-ink">
                      {project.name}
                    </Link>
                    {awaitingLabel(stage, project.gates) ? (
                      <p className="mt-2 w-fit rounded-full bg-focus px-2 py-1 text-[11px] text-ink">Awaiting: {awaitingLabel(stage, project.gates)}</p>
                    ) : null}
                    <p className="mt-2 text-[12px] text-ink-2">{daysInStageLabel(project.stage_entered_at)} in stage</p>
                  </article>
                ))}
            </div>
          </div>
        ))}
      </div>
      <StageGateDialog
        target={drag?.stage ?? null}
        pending={drag?.pending ?? []}
        busy={busy}
        onCancel={() => setDrag(null)}
        onMove={() => {
          if (drag) void commit(drag.id, drag.stage, "move")
        }}
        onApprove={() => {
          if (drag) void commit(drag.id, drag.stage, "approve")
        }}
      />
      <Modal open={creating} onOpenChange={setCreating} title="New project" description="The project is saved to the studio.">
        <CreateProjectForm clients={clients} onDone={() => setCreating(false)} />
      </Modal>
    </section>
  )
}
