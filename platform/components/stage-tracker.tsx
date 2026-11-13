"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { moveProjectStage } from "@/app/(studio)/studio/projects/actions"
import { useToast } from "@/components/toast-provider"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/dialog"
import { stageLabel, stages, type Stage } from "@/lib/labels"

export function StageTracker({ projectId, stage }: { projectId: string; stage: Stage }) {
  const [next, setNext] = useState<Stage | null>(null)
  const [pending, setPending] = useState(false)
  const toast = useToast()
  const router = useRouter()

  return (
    <div>
      <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {stages.map((item) => (
          <li key={item}>
            <button
              type="button"
              className={`w-full rounded-2xl px-2 py-3 text-left text-[12px] uppercase tracking-[0.08em] ${item === stage ? "bg-brand text-surface" : "bg-column text-ink-2"}`}
              onClick={() => {
                if (item !== stage) setNext(item)
              }}
            >
              {stageLabel(item)}
            </button>
          </li>
        ))}
      </ol>
      <Modal
        open={next !== null}
        onOpenChange={(open) => {
          if (!open) setNext(null)
        }}
        title="Move this project?"
        description={next ? `This records a move to ${stageLabel(next)} on the timeline.` : undefined}
      >
        <Button
          type="button"
          disabled={pending || !next}
          onClick={async () => {
            if (!next) return
            setPending(true)
            const result = await moveProjectStage(projectId, next)
            setPending(false)
            toast(result.message)
            if (result.ok) {
              setNext(null)
              router.refresh()
            }
          }}
        >
          Move stage
        </Button>
      </Modal>
    </div>
  )
}
