import Link from "next/link"

import { formatShort } from "@/lib/dates"
import { materialStatusLabel } from "@/lib/labels"
import type { DeliveryWatch } from "@/lib/records"

export function DeliveryWatch({ late, due }: { late: DeliveryWatch[]; due: DeliveryWatch[] }) {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <WatchList title="Late deliveries" empty="No late deliveries." items={late} />
      <WatchList title="Due this week" empty="Nothing due this week." items={due} />
    </section>
  )
}

function WatchList({ title, empty, items }: { title: string; empty: string; items: DeliveryWatch[] }) {
  return (
    <div className="rounded-[28px] bg-surface p-5 shadow-[var(--shadow)]">
      <h2 className="text-[18px] font-medium">{title}</h2>
      {items.length === 0 ? <p className="mt-3 text-[14px] text-ink-2">{empty}</p> : null}
      <ul className="mt-3 grid gap-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link href={`/studio/projects/${item.project_id}?tab=materials`} className="flex items-center justify-between gap-3 rounded-2xl px-2 py-2 hover:bg-column">
              <span>
                <span className="block text-[15px]">{item.item}</span>
                <span className="text-[12px] text-ink-3">{item.project_name}</span>
              </span>
              <span className="text-[13px] text-ink-2">
                {materialStatusLabel(item.status)} · {formatShort(item.expected_at)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
