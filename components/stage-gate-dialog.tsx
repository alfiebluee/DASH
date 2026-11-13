"use client"

import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/dialog"
import { stageLabel, type Stage } from "@/lib/labels"
import { gateWarning, type GateApproval } from "@/lib/stages"

export function StageGateDialog({
  target,
  pending,
  busy,
  onCancel,
  onMove,
  onApprove,
}: {
  target: Stage | null
  pending: GateApproval[]
  busy: boolean
  onCancel: () => void
  onMove: () => void
  onApprove: () => void
}) {
  return (
    <Modal open={target !== null && pending.length > 0} onOpenChange={(open) => { if (!open) onCancel() }} title="Approvals still pending" description={target ? gateWarning(pending, target) : undefined}>
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={busy} onClick={onApprove}>
          Mark as approved now
        </Button>
        <Button type="button" tone="surface" disabled={busy} onClick={onMove}>
          Move anyway
        </Button>
        <Button type="button" tone="quiet" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Modal>
  )
}

export function AdvanceSuggestion({ stage, busy, onMove }: { stage: Stage; busy: boolean; onMove: () => void }) {
  return (
    <p className="mt-4 flex flex-wrap items-center gap-3 text-[14px] text-ink">
      <span>All approvals done. Move to {stageLabel(stage)}?</span>
      <Button type="button" disabled={busy} onClick={onMove}>
        Move to {stageLabel(stage)}
      </Button>
    </p>
  )
}
