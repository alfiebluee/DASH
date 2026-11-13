"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { saveOrder } from "@/app/(studio)/studio/projects/[id]/orders-actions"
import { useCanEdit } from "@/components/studio-access"
import { useToast } from "@/components/toast-provider"
import { Button } from "@/components/ui/button"
import { materialStatusLabel } from "@/lib/labels"
import { formatMoney, orderTotal } from "@/lib/money"
import type { MaterialRecord, OrderRecord, SupplierRecord } from "@/lib/records"

function day(value: string | null): string {
  return value ? value.slice(0, 10) : ""
}

export function OrdersPanel({
  projectId,
  orders,
  materials,
  suppliers,
}: {
  projectId: string
  orders: OrderRecord[]
  materials: MaterialRecord[]
  suppliers: SupplierRecord[]
}) {
  return (
    <div className="grid gap-4">
      {orders.length === 0 ? (
        <p className="text-[15px] text-ink-2">No orders yet. Select items on the materials tab and group them into an order.</p>
      ) : null}
      {orders.map((order) => (
        <OrderCard key={order.id} projectId={projectId} order={order} materials={materials.filter((item) => item.order_id === order.id)} suppliers={suppliers} />
      ))}
    </div>
  )
}

function OrderCard({
  projectId,
  order,
  materials,
  suppliers,
}: {
  projectId: string
  order: OrderRecord
  materials: MaterialRecord[]
  suppliers: SupplierRecord[]
}) {
  const toast = useToast()
  const router = useRouter()
  const canEdit = useCanEdit()
  const [pending, setPending] = useState(false)
  const [vat, setVat] = useState(String(order.vat))
  const [vatIncluded, setVatIncluded] = useState(order.vat_included)
  const [delivery, setDelivery] = useState(String(order.delivery_cost))
  const itemsTotal = materials.reduce((sum, item) => (item.status === "cancelled" ? sum : sum + item.line_total), order.items_total && materials.length === 0 ? order.items_total : 0)
  const total = orderTotal({
    itemsTotal: materials.length > 0 ? itemsTotal : order.items_total,
    vat: Number(vat) || 0,
    vatIncluded,
    delivery: Number(delivery) || 0,
  })

  if (!canEdit) {
    return (
      <section className="grid gap-2 rounded-[28px] bg-surface p-5 shadow-[var(--shadow)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[18px] font-medium">{order.reference || order.supplier_name || "Order"}</h2>
          <span className="rounded-full bg-column px-3 py-1 text-[12px]">{materialStatusLabel(order.status)}</span>
        </div>
        <p className="text-[14px] text-ink-2">{order.supplier_name || "No supplier"}{order.paid_with ? ` · ${order.paid_with}` : ""}</p>
        <p className="text-[16px]">Total {formatMoney(order.total)}</p>
        {materials.length > 0 ? (
          <ul className="grid gap-1 text-[14px] text-ink-2">
            {materials.map((item) => (
              <li key={item.id}>{item.item} · {formatMoney(item.line_total)} · {materialStatusLabel(item.status)}</li>
            ))}
          </ul>
        ) : null}
      </section>
    )
  }

  async function save(status: OrderRecord["status"], form: FormData) {
    setPending(true)
    const result = await saveOrder(projectId, order.id, {
      supplier_id: String(form.get("supplier_id") ?? ""),
      reference: String(form.get("reference") ?? ""),
      vat: Number(form.get("vat") ?? 0),
      vat_included: form.get("vat_included") === "on",
      delivery: Number(form.get("delivery") ?? 0),
      paid_with: String(form.get("paid_with") ?? ""),
      status,
      expected_at: String(form.get("expected_at") ?? ""),
    })
    setPending(false)
    toast(result.message)
    if (result.ok) router.refresh()
  }

  return (
    <form
      className="grid gap-3 rounded-[28px] bg-surface p-5 shadow-[var(--shadow)]"
      onSubmit={(event) => {
        event.preventDefault()
        void save(order.status, new FormData(event.currentTarget))
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[18px] font-medium">{order.reference || order.supplier_name || "Order"}</h2>
        <span className="rounded-full bg-column px-3 py-1 text-[12px]">{materialStatusLabel(order.status)}</span>
      </div>
      <label className="grid gap-1 text-[13px] text-ink-2">
        Supplier
        <select name="supplier_id" defaultValue={order.supplier_id ?? ""} aria-label={`Supplier for ${order.reference || "order"}`}>
          <option value="">No supplier</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-[13px] text-ink-2">
        Reference
        <input name="reference" defaultValue={order.reference} aria-label={`Reference for ${order.reference || "order"}`} />
      </label>
      <label className="grid gap-1 text-[13px] text-ink-2">
        VAT
        <input name="vat" type="number" min={0} step="0.01" value={vat} aria-label={`VAT for ${order.reference || "order"}`} onChange={(event) => setVat(event.target.value)} />
      </label>
      <label className="flex items-center gap-2 text-[14px]">
        <input name="vat_included" type="checkbox" checked={vatIncluded} aria-label={`VAT included for ${order.reference || "order"}`} onChange={(event) => setVatIncluded(event.target.checked)} />
        VAT included
      </label>
      <label className="grid gap-1 text-[13px] text-ink-2">
        Delivery charge
        <input name="delivery" type="number" min={0} step="0.01" value={delivery} aria-label={`Delivery for ${order.reference || "order"}`} onChange={(event) => setDelivery(event.target.value)} />
      </label>
      <label className="grid gap-1 text-[13px] text-ink-2">
        Paid with
        <input name="paid_with" defaultValue={order.paid_with} placeholder="Lloyds or Amex" aria-label={`Paid with for ${order.reference || "order"}`} />
      </label>
      <label className="grid gap-1 text-[13px] text-ink-2">
        Expected
        <input name="expected_at" type="date" defaultValue={day(order.expected_at)} aria-label={`Expected for ${order.reference || "order"}`} />
      </label>
      <p className="text-[14px] text-ink-2">Items {formatMoney(materials.length > 0 ? itemsTotal : order.items_total)}</p>
      <p className="text-[16px]">Total {formatMoney(total)}</p>
      {materials.length > 0 ? (
        <ul className="grid gap-1 text-[14px] text-ink-2">
          {materials.map((item) => (
            <li key={item.id}>{item.item} · {formatMoney(item.line_total)} · {materialStatusLabel(item.status)}</li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>Save order</Button>
        {order.status !== "delivered" ? (
          <Button
            type="button"
            tone="surface"
            disabled={pending}
            onClick={(event) => {
              const form = event.currentTarget.form
              if (form) void save("delivered", new FormData(form))
            }}
          >
            Mark delivered
          </Button>
        ) : null}
      </div>
    </form>
  )
}
