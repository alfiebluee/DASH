import { formatMoney } from "@/lib/money"
import type { BudgetLineRecord } from "@/lib/records"

export function PortalBudget({ lines }: { lines: BudgetLineRecord[] }) {
  const total = lines.reduce((sum, line) => sum + line.amount, 0)
  return (
    <section data-testid="budget-split" className="rounded-[24px] bg-surface p-4 shadow-[var(--shadow)]">
      <h2 className="text-[18px] font-medium">Budget</h2>
      {lines.length === 0 ? <p className="mt-3 text-[15px] text-ink-2">The budget split has not been added yet.</p> : null}
      <dl className="mt-3 grid gap-2">
        {lines.map((line) => (
          <div key={line.id} className="flex items-center justify-between gap-3 text-[15px]">
            <dt>{line.label}</dt>
            <dd>{formatMoney(line.amount)}</dd>
          </div>
        ))}
      </dl>
      {lines.length > 0 ? <p className="mt-4 text-[16px]">Total {formatMoney(total)}</p> : null}
    </section>
  )
}
