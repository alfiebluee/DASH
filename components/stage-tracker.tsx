"use client"

import { Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { moveProjectStage } from "@/app/(studio)/studio/projects/actions"
import { AdvanceSuggestion, StageGateDialog } from "@/components/stage-gate-dialog"
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
      <ol className="flex items-stretch gap-1 overflow-x-auto pb-1">
        {stages.map((item, index) => {
          const done = index < current
          const here = index === current
          const between = gates.filter((gate) => gate.gate_for_stage === item)
          return (
            <li key={item} className="flex min-w-[108px] flex-1 items-stretch">
              <button
                type="button"
                aria-current={here ? "step" : undefined}
                className={`flex w-full items-center gap-2 rounded-2xl px-3 py-3 text-left text-[12px] uppercase tracking-[0.06em] ${here ? "bg-brand text-surface" : done ? "bg-brand-tint text-ink" : "bg-column text-ink-3"}`}
                onClick={() => choose(item)}
              >
                {done ? <Check className="size-3.5 shrink-0" aria-hidden /> : null}
                {stageLabel(item)}
              </button>
              {index < stages.length - 1 ? (
                <span className="flex w-3 shrink-0 flex-col items-center justify-center gap-1" aria-hidden={between.length === 0}>
                  {between.map((gate) => (
                    <span
                      key={gate.id}
                      title={`${approvalLabel(gate.kind)} · ${gate.status === "approved" ? "approved" : "pending"}`}
                      className={`size-2 rounded-full ${gate.status === "approved" ? "bg-brand" : "bg-ink-3"}`}
                    />
                  ))}
                </span>
              ) : null}
            </li>
          )
        })}
      </ol>
      {suggestion ? (
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
