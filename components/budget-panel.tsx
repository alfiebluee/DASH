"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { addCustomLine, ensureBudgetLines, removeCustomLine, saveBudgetAmount, sendBudget } from "@/app/(studio)/studio/projects/[id]/budget-actions"
import { useCanEdit } from "@/components/studio-access"
import { useToast } from "@/components/toast-provider"
import { Button } from "@/components/ui/button"
import { agreedTotal, contingencyIsHot, contingencyPosition, formatMoney, materialsLineAmount } from "@/lib/money"
import type { BudgetLineRecord, BudgetSummary } from "@/lib/records"

const standard = ["design_delivery", "handyman", "materials", "contingency"]

export function BudgetPanel({
  projectId,
  lines,
  summary,
  locked,
}: {
  projectId: string
  lines: BudgetLineRecord[]
  summary: BudgetSummary | null
  locked: boolean
}) {
  const toast = useToast()
  const router = useRouter()
  const canEdit = useCanEdit()
  const [pending, setPending] = useState(false)
  const planned = summary?.materials_planned ?? 0
  const storedMaterials = lines.find((line) => line.kind === "materials")?.amount ?? summary?.materials_line ?? 0
  const materialsAmount = materialsLineAmount(locked, storedMaterials, planned)
  const ready = standard.every((kind) => lines.some((line) => line.kind === kind))
  const position = contingencyPosition({
    materialsLine: materialsAmount,
    materialsActual: summary?.materials_actual ?? 0,
    delivery: summary?.delivery_charges ?? 0,
    contingency: lines.find((line) => line.kind === "contingency")?.amount ?? 0,
  })
  const hot = contingencyIsHot(position.percentUsed)
  const total = agreedTotal(lines.map((line) => (line.kind === "materials" ? materialsAmount : line.amount)))

  async function run(action: () => Promise<{ ok: boolean; message: string }>) {
    setPending(true)
    const result = await action()
    setPending(false)
    toast(result.message)
    if (result.ok) router.refresh()
    return result.ok
  }

  return (
    <div className="grid gap-4">
      {locked ? <p className="text-[15px] text-ink-2">The client approved this budget. The agreed total is locked.</p> : null}
      {canEdit && !ready ? (
        <section className="rounded-[28px] bg-surface p-6 shadow-[var(--shadow)]">
          <h2 className="text-[18px] font-medium">Budget lines</h2>
          <p className="mt-2 text-[14px] text-ink-2">Design & Delivery, Handyman, Materials and Contingency.</p>
          <Button type="button" className="mt-4" disabled={pending} onClick={() => void run(() => ensureBudgetLines(projectId))}>
            Add budget lines
          </Button>
        </section>
      ) : null}
      {lines.map((line) => (
        <section key={line.id} className="rounded-[24px] bg-surface p-4 shadow-[var(--shadow)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[16px]">{line.label}</h2>
            {line.kind === "materials" || !canEdit ? (
              <p aria-label={line.kind === "materials" ? "Materials amount" : undefined}>{formatMoney(line.kind === "materials" ? materialsAmount : line.amount)}</p>
            ) : (
              <input
                aria-label={`${line.label} amount`}
                type="number"
                min={0}
                step="0.01"
                defaultValue={line.amount}
                disabled={locked || pending}
                className="w-36"
                onBlur={(event) => {
                  const amount = Number(event.target.value)
                  if (!Number.isFinite(amount) || amount === line.amount) return
                  void run(() => saveBudgetAmount(projectId, line.id, amount))
                }}
              />
            )}
          </div>
          {line.kind === "materials" ? (
            <p className="mt-2 text-[13px] text-ink-3">
              {locked ? "Frozen when the budget was approved." : "Follows the materials list until the client approves."}
            </p>
          ) : null}
          {canEdit && line.kind === "other" && !locked ? (
            <button type="button" className="mt-2 text-[13px] text-ink-2" disabled={pending} onClick={() => void run(() => removeCustomLine(projectId, line.id))}>
              Remove {line.label}
            </button>
          ) : null}
        </section>
      ))}
      {canEdit && !locked ? (
        <form
          className="flex flex-wrap items-end gap-3 rounded-[24px] bg-surface p-4 shadow-[var(--shadow)]"
          onSubmit={(event) => {
            event.preventDefault()
            const form = event.currentTarget
            const data = new FormData(form)
            void run(() => addCustomLine(projectId, String(data.get("label") ?? ""), Number(data.get("amount") ?? 0))).then((ok) => {
              if (ok) form.reset()
            })
          }}
        >
          <label className="grid gap-1 text-[13px] text-ink-2">
            Custom line
            <input name="label" required aria-label="Custom line" />
          </label>
          <label className="grid gap-1 text-[13px] text-ink-2">
            Amount
            <input name="amount" type="number" min={0} step="0.01" defaultValue={0} required aria-label="Custom amount" />
          </label>
          <Button type="submit" tone="surface" disabled={pending}>Add line</Button>
        </form>
      ) : null}
      <section className={`rounded-[28px] p-6 shadow-[var(--shadow)] ${hot ? "bg-danger/10" : "bg-surface"}`}>
        <h2 className="text-[18px] font-medium">Summary</h2>
        <dl className="mt-4 grid gap-2 text-[15px]">
          <div className="flex justify-between gap-4"><dt>Materials planned</dt><dd>{formatMoney(planned)}</dd></div>
          <div className="flex justify-between gap-4"><dt>Materials actual</dt><dd>{formatMoney(summary?.materials_actual ?? 0)}</dd></div>
          <div className="flex justify-between gap-4"><dt>Delivery charges</dt><dd>{formatMoney(summary?.delivery_charges ?? 0)}</dd></div>
          <div className="flex justify-between gap-4"><dt>Contingency remaining</dt><dd>{formatMoney(position.remaining)}</dd></div>
          <div className="flex justify-between gap-4"><dt>Contingency used</dt><dd className={hot ? "text-danger" : undefined}>{position.percentUsed}%</dd></div>
          <div className="flex justify-between gap-4 text-[18px]"><dt>Agreed total</dt><dd>{formatMoney(locked ? summary?.agreed_total ?? total : total)}</dd></div>
        </dl>
        {hot ? <p className="mt-3 text-[14px] text-danger">Contingency is over 90% used.</p> : null}
        {canEdit && !locked ? (
          <Button type="button" className="mt-5" disabled={pending} onClick={() => void run(() => sendBudget(projectId))}>
            Send budget for approval
          </Button>
        ) : null}
      </section>
    </div>
  )
}
