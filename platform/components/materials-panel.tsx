"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { addArea, addMaterial, deleteMaterial, restoreMaterial, setMaterialStatus } from "@/app/(studio)/studio/projects/[id]/materials-actions"
import { useToast } from "@/components/toast-provider"
import { Button } from "@/components/ui/button"
import type { AreaRecord, MaterialRecord, SupplierRecord } from "@/lib/records"

function money(value: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value)
}

export function MaterialsPanel({
  projectId,
  areas,
  materials,
  suppliers,
}: {
  projectId: string
  areas: AreaRecord[]
  materials: MaterialRecord[]
  suppliers: SupplierRecord[]
}) {
  const toast = useToast()
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [removed, setRemoved] = useState<MaterialRecord | null>(null)
  const total = materials.reduce((sum, item) => sum + item.line_total, 0)
  const groups = [
    ...areas.map((area) => ({ id: area.id, name: area.name, items: materials.filter((item) => item.area_id === area.id) })),
    { id: "none", name: "No area", items: materials.filter((item) => !item.area_id) },
  ].filter((group) => group.id !== "none" || group.items.length > 0)

  async function run(action: () => Promise<{ ok: boolean; message: string }>) {
    setPending(true)
    const result = await action()
    setPending(false)
    toast(result.message)
    if (result.ok) router.refresh()
    return result.ok
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[28px] bg-surface p-6 shadow-[var(--shadow)]">
        <h2 className="text-[18px] font-medium">Add an area</h2>
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={async (event) => {
            event.preventDefault()
            const form = event.currentTarget
            const ok = await run(() => addArea(projectId, new FormData(form)))
            if (ok) form.reset()
          }}
        >
          <label className="grid gap-1 text-[13px] text-ink-2">
            Area name
            <input name="name" required placeholder="Dresser area" />
          </label>
          <Button type="submit" disabled={pending}>Add area</Button>
        </form>
      </section>

      <section className="rounded-[28px] bg-surface p-6 shadow-[var(--shadow)]">
        <h2 className="text-[18px] font-medium">Add an item</h2>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault()
            const form = event.currentTarget
            const ok = await run(() => addMaterial(projectId, new FormData(form)))
            if (ok) form.reset()
          }}
        >
          <label className="grid gap-1 text-[13px] text-ink-2">
            Item
            <input name="item" required />
          </label>
          <label className="grid gap-1 text-[13px] text-ink-2">
            Spec
            <input name="spec" />
          </label>
          <label className="grid gap-1 text-[13px] text-ink-2">
            Qty
            <input name="quantity" type="number" min={0} step="0.01" defaultValue={1} required />
          </label>
          <label className="grid gap-1 text-[13px] text-ink-2">
            Unit £
            <input name="unit_cost" type="number" min={0} step="0.01" defaultValue={0} required />
          </label>
          <label className="grid gap-1 text-[13px] text-ink-2">
            Area
            <select name="area_id" defaultValue="">
              <option value="">No area</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>{area.name}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-[13px] text-ink-2">
            Supplier
            <select name="supplier_id" defaultValue="">
              <option value="">No supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-[13px] text-ink-2">
            Lead days
            <input name="lead_days" type="number" min={0} placeholder="Supplier default" />
          </label>
          <label className="grid gap-1 text-[13px] text-ink-2">
            Priority
            <select name="priority" defaultValue="normal">
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>Add item</Button>
          </div>
        </form>
      </section>

      <p className="text-[15px] text-ink-2">Materials total {money(total)}</p>
      {removed ? (
        <button
          type="button"
          className="w-fit rounded-full bg-ink px-4 py-2 text-[13px] text-surface"
          onClick={() => {
            const item = removed
            setRemoved(null)
            void run(() => restoreMaterial(projectId, item))
          }}
        >
          Undo remove {removed.item}
        </button>
      ) : null}
      {materials.length === 0 ? <p className="text-[15px] text-ink-2">No materials yet. Add an item above.</p> : null}
      {groups.map((group) => (
        <section key={group.id}>
          <h2 className="text-[13px] uppercase tracking-[0.16em] text-ink-3">{group.name}</h2>
          <ul className="mt-3 grid gap-3">
            {group.items.map((item) => (
              <li key={item.id} className={`rounded-[24px] bg-surface p-4 shadow-[var(--shadow)] ${item.status === "late" ? "ring-2 ring-[#B3261E]" : ""}`}>
                <p className="text-[16px]">{item.item}</p>
                <p className="mt-1 text-[13px] text-ink-2">
                  {item.quantity} × {money(item.unit_cost)} · {money(item.line_total)} · {item.status.replace("_", " ")}
                  {item.expected_at ? ` · expected ${item.expected_at}` : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.status !== "ordered" && item.status !== "delivered" ? (
                    <Button type="button" tone="surface" disabled={pending} onClick={() => void run(() => setMaterialStatus(projectId, item.id, "ordered"))}>
                      Mark ordered
                    </Button>
                  ) : null}
                  {item.status !== "delivered" ? (
                    <Button type="button" tone="surface" disabled={pending} onClick={() => void run(() => setMaterialStatus(projectId, item.id, "delivered"))}>
                      Mark delivered
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    tone="quiet"
                    disabled={pending}
                    onClick={() => {
                      void run(async () => {
                        const result = await deleteMaterial(projectId, item.id)
                        if (result.ok) setRemoved(item)
                        return result
                      })
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
