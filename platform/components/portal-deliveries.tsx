import { materialStatusLabel } from "@/lib/labels"
import type { ClientMaterial } from "@/lib/records"

function day(value: string | null): string {
  return value ? value.slice(0, 10) : "—"
}

export function PortalDeliveries({ items }: { items: ClientMaterial[] }) {
  return (
    <section data-testid="deliveries" className="mt-8">
      <h2 className="text-[18px] font-medium">Deliveries</h2>
      {items.length === 0 ? <p className="mt-3 text-[15px] text-ink-2">No materials have been listed yet.</p> : null}
        <div className="mt-3 min-w-0 max-w-full overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-[14px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.08em] text-ink-3">
              <th className="py-2 pr-3">Area</th>
              <th className="py-2 pr-3">Item</th>
              <th className="py-2 pr-3">Qty</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Expected</th>
              <th className="py-2">Delivered</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.area}-${item.item}-${item.expected_at ?? ""}`} className="border-t border-line">
                <td className="py-3 pr-3">{item.area || "—"}</td>
                <td className="py-3 pr-3">{item.item}</td>
                <td className="py-3 pr-3">{item.quantity}</td>
                <td className="py-3 pr-3">{materialStatusLabel(item.status)}</td>
                <td className="py-3 pr-3">{day(item.expected_at)}</td>
                <td className="py-3">{day(item.delivered_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
