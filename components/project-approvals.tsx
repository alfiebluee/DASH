"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { approveProjectGate } from "@/app/(studio)/studio/projects/actions"
import { useToast } from "@/components/toast-provider"
import { Button } from "@/components/ui/button"
import { approvalLabel, stageLabel, stages } from "@/lib/labels"
import type { ProjectGate } from "@/lib/records"

export function ProjectApprovals({ gates }: { gates: ProjectGate[] }) {
  const toast = useToast()
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const groups = stages.flatMap((stage) => {
    const items = gates.filter((gate) => gate.gate_for_stage === stage)
    return items.length > 0 ? [{ stage, items }] : []
  })

  return (
    <section id="approvals" className="rounded-[28px] bg-surface p-6 shadow-[var(--shadow)]">
      <h2 className="text-[18px] font-medium">Approvals</h2>
      {groups.length === 0 ? <p className="mt-4 text-[15px] text-ink-2">No approvals on this project yet.</p> : null}
      <div className="mt-4 grid gap-6">
        {groups.map((group) => (
          <div key={group.stage}>
            <h3 className="text-[12px] uppercase tracking-[0.12em] text-ink-3">{stageLabel(group.stage)}</h3>
            <ul className="mt-2 grid gap-2">
              {group.items.map((gate) => (
                <li key={gate.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-column px-3 py-3">
                  <div>
                    <p className="text-[15px]">{approvalLabel(gate.kind)}</p>
                    <p className="text-[12px] text-ink-3">{gate.status === "approved" ? "Approved" : "Pending"}</p>
                  </div>
                  {gate.status === "approved" ? (
                    <span className="rounded-full bg-brand-tint px-3 py-1 text-[12px] text-brand-hover">Approved</span>
                  ) : (
                    <Button
                      type="button"
                      disabled={busyId === gate.id}
                      onClick={async () => {
                        setBusyId(gate.id)
                        const result = await approveProjectGate(gate.id)
                        setBusyId(null)
                        toast(result.message)
                        if (result.ok) router.refresh()
                      }}
                    >
                      Mark approved
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
