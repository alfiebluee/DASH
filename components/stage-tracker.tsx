"use client"

import { Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { moveProjectStage } from "@/app/(studio)/studio/projects/actions"
import { AdvanceSuggestion, StageGateDialog } from "@/components/stage-gate-dialog"
import { useCanEdit } from "@/components/studio-access"
import { useToast } from "@/components/toast-provider"
import { approvalLabel, stageLabel, stages, type Stage } from "@/lib/labels"
import type { ProjectGate } from "@/lib/records"
import { blockingApprovals, readyToAdvance, type GateApproval } from "@/lib/stages"

export function StageTracker({ projectId, stage, gates }: { projectId: string; stage: Stage; gates: ProjectGate[] }) {
  const [target, setTarget] = useState<Stage | null>(null)
  const [pendingGates, setPendingGates] = useState<GateApproval[]>([])
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const router = useRouter()
  const canEdit = useCanEdit()
  const current = stages.indexOf(stage)
  const suggestion = readyToAdvance(stage, gates)

  async function commit(next: Stage, choice: "move" | "approve") {
    setBusy(true)
    const result = await moveProjectStage(projectId, next, choice)
    setBusy(false)
    toast(result.message)
    if (result.ok) {
      setTarget(null)
      setPendingGates([])
      router.refresh()
    }
  }

  function choose(next: Stage) {
    if (next === stage) return
    const pending = blockingApprovals(stage, next, gates)
    if (pending.length > 0) {
      setTarget(next)
      setPendingGates(pending)
      return
    }
    void commit(next, "move")
  }

  return (
    <div>
      <ol className="grid grid-cols-2 gap-1 sm:grid-cols-7">
        {stages.map((item, index) => {
          const done = index < current
          const here = index === current
          const between = gates.filter((gate) => gate.gate_for_stage === item)
          return (
            <li key={item} className="flex min-w-0 flex-col">
              {canEdit ? (
                <button
                  type="button"
                  aria-current={here ? "step" : undefined}
                  className={`flex w-full min-w-0 flex-1 flex-col items-start gap-1 rounded-2xl px-2 py-2 text-left text-[10px] uppercase leading-tight tracking-[0.04em] break-words ${here ? "bg-brand text-surface" : done ? "bg-brand-tint text-ink" : "bg-column text-ink-3"}`}
                  onClick={() => choose(item)}
                >
                  {done ? <Check className="size-3.5 shrink-0" aria-hidden /> : null}
                  {stageLabel(item)}
                </button>
              ) : (
                <div
                  aria-current={here ? "step" : undefined}
                  className={`flex w-full min-w-0 flex-1 flex-col items-start gap-1 rounded-2xl px-2 py-2 text-left text-[10px] uppercase leading-tight tracking-[0.04em] break-words ${here ? "bg-brand text-surface" : done ? "bg-brand-tint text-ink" : "bg-column text-ink-3"}`}
                >
                  {done ? <Check className="size-3.5 shrink-0" aria-hidden /> : null}
                  {stageLabel(item)}
                </div>
              )}
              <span className="mt-1 flex h-2 gap-1" aria-hidden={between.length === 0}>
                {between.map((gate) => (
                  <span
                    key={gate.id}
                    title={`${approvalLabel(gate.kind)} · ${gate.status === "approved" ? "approved" : "pending"}`}
                    className={`size-2 rounded-full ${gate.status === "approved" ? "bg-brand" : "bg-ink-3"}`}
                  />
                ))}
              </span>
            </li>
          )
        })}
      </ol>
      {canEdit && suggestion ? (
        <AdvanceSuggestion stage={suggestion} busy={busy} onMove={() => void commit(suggestion, "move")} />
      ) : null}
      <StageGateDialog
        target={target}
        pending={pendingGates}
        busy={busy}
        onCancel={() => {
          setTarget(null)
          setPendingGates([])
        }}
        onMove={() => {
          if (target) void commit(target, "move")
        }}
        onApprove={() => {
          if (target) void commit(target, "approve")
        }}
      />
    </div>
  )
}
