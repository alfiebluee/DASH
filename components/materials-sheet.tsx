"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import {
  addArea,
  addMaterial,
  deleteMaterial,
  duplicateMaterial,
  importMaterials,
  placeArea,
  placeMaterial,
  renameArea,
  restoreMaterial,
  suggestMaterials,
  updateManyMaterials,
  updateMaterial,
} from "@/app/(studio)/studio/projects/[id]/materials-actions"
import { createOrder } from "@/app/(studio)/studio/projects/[id]/orders-actions"
import { MaterialsImport } from "@/components/materials-import"
import { useCanEdit } from "@/components/studio-access"
import { useToast } from "@/components/toast-provider"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/dialog"
import { londonToday } from "@/lib/dates"
import { materialStatusLabel } from "@/lib/labels"
import { formatMoney, orderTotal } from "@/lib/money"
import type { AreaRecord, MaterialRecord, MaterialSuggestion, OrderRecord, SupplierRecord } from "@/lib/records"
import { guessMapping, headerMatchCount, parseTable, pasteMapping, planImport, safeHttpUrl } from "@/lib/sheets"

const statuses = ["to_order", "ordered", "delivered", "late", "cancelled"] as const

type Draft = {
  item: string
  spec: string
  quantity: string
  unitCost: string
  supplierId: string
  link: string
  notes: string
  lead: string
  priority: "normal" | "high"
}

const emptyDraft: Draft = {
  item: "",
  spec: "",
  quantity: "1",
  unitCost: "0",
  supplierId: "",
  link: "",
  notes: "",
  lead: "",
  priority: "normal",
}

function day(value: string | null): string {
  return value ? value.slice(0, 10) : ""
}

function layoutRows(blocks: Array<{ id: string; name: string; items: MaterialRecord[] }>, collapsed: string[]) {
  const laid: Array<{ group: (typeof blocks)[number]; start: number }> = []
  let start = 0
  for (const group of blocks) {
    laid.push({ group, start })
    if (!collapsed.includes(group.id)) start += group.items.length + 1
  }
  return laid
}

function caretAtStart(target: HTMLElement): boolean {
  return target instanceof HTMLInputElement && (target.selectionStart ?? 0) === 0
}

function caretAtEnd(target: HTMLElement): boolean {
  return target instanceof HTMLInputElement && (target.selectionStart ?? 0) === target.value.length
}

export function MaterialsSheet({
  projectId,
  areas,
  materials,
  suppliers,
  orders,
}: {
  projectId: string
  areas: AreaRecord[]
  materials: MaterialRecord[]
  suppliers: SupplierRecord[]
  orders: OrderRecord[]
}) {
  const toast = useToast()
  const router = useRouter()
  const canEdit = useCanEdit()
  const incoming = JSON.stringify(materials)
  const [items, setItems] = useState(materials)
  const [seen, setSeen] = useState(incoming)
  const [selected, setSelected] = useState<string[]>([])
  const [collapsed, setCollapsed] = useState<string[]>([])
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [pending, setPending] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [ordering, setOrdering] = useState(false)
  const [moveArea, setMoveArea] = useState("")
  const [focusArea, setFocusArea] = useState<string | null>(null)
  const [orderForm, setOrderForm] = useState({
    supplierId: "",
    reference: "",
    vat: "0",
    vatIncluded: false,
    delivery: "0",
    paidWith: "",
    status: "ordered",
    expected: "",
  })
  if (seen !== incoming) {
    setSeen(incoming)
    setItems(materials)
  }

  const active = items.filter((item) => item.status !== "cancelled")
  const grand = active.reduce((sum, item) => sum + item.line_total, 0)
  const selectedItems = items.filter((item) => selected.includes(item.id))
  const selectedTotal = selectedItems.reduce((sum, item) => sum + item.line_total, 0)
  const quotedTotal = orderTotal({
    itemsTotal: selectedTotal,
    vat: Number(orderForm.vat) || 0,
    vatIncluded: orderForm.vatIncluded,
    delivery: Number(orderForm.delivery) || 0,
  })

  function groups() {
    const ordered = [...areas].sort((a, b) => a.sort_order - b.sort_order)
    const blocks = ordered.map((area) => ({
      id: area.id,
      name: area.name,
      items: items.filter((item) => item.area_id === area.id).sort((a, b) => a.sort_order - b.sort_order),
    }))
    const loose = items.filter((item) => !item.area_id).sort((a, b) => a.sort_order - b.sort_order)
    if (loose.length > 0 || ordered.length === 0) blocks.push({ id: "", name: "No area", items: loose })
    return blocks
  }

  async function run(action: () => Promise<{ ok: boolean; message: string }>) {
    setPending(true)
    const result = await action()
    setPending(false)
    toast(result.message)
    if (result.ok) router.refresh()
    return result.ok
  }

  async function commit(id: string, patch: Record<string, unknown>) {
    const result = await updateMaterial(projectId, id, patch)
    if (!result.ok || !result.material) {
      toast(result.message)
      return
    }
    setItems((current) => current.map((item) => (item.id === id ? result.material ?? item : item)))
    toast("Saved.")
  }

  function draftFor(areaId: string): Draft {
    return drafts[areaId] ?? emptyDraft
  }

  function setDraft(areaId: string, patch: Partial<Draft>) {
    setDrafts((current) => ({ ...current, [areaId]: { ...draftFor(areaId), ...patch } }))
  }

  async function submitDraft(areaId: string) {
    const draft = draftFor(areaId)
    if (!draft.item.trim()) return
    const form = new FormData()
    form.set("item", draft.item.trim())
    form.set("spec", draft.spec)
    form.set("quantity", draft.quantity || "1")
    form.set("unit_cost", draft.unitCost || "0")
    form.set("supplier_id", draft.supplierId)
    form.set("area_id", areaId)
    form.set("lead_days", draft.lead)
    form.set("priority", draft.priority)
    form.set("notes", draft.notes)
    form.set("link", draft.link)
    const ok = await run(() => addMaterial(projectId, form))
    if (ok) setDrafts((current) => ({ ...current, [areaId]: emptyDraft }))
  }

  const laidOut = layoutRows(groups(), collapsed)

  if (!canEdit) {
    const blocks = groups().filter((group) => group.items.length > 0)
    return (
      <div className="grid min-w-0 gap-4" data-testid="materials-sheet">
        {blocks.length === 0 ? <p className="text-[15px] text-ink-2">No materials yet.</p> : null}
        {blocks.map((group) => (
          <section key={group.id || "none"} className="rounded-[28px] bg-surface p-5 shadow-[var(--shadow)]">
            <h2 className="text-[16px] font-medium">{group.name}</h2>
            <ul className="mt-3 grid gap-2">
              {group.items.map((item) => (
                <li key={item.id} className="text-[14px]">
                  {item.item}
                  {item.spec ? <span className="text-ink-3"> · {item.spec}</span> : null}
                  <span className="text-ink-2"> · {item.quantity} · {formatMoney(item.line_total)} · {materialStatusLabel(item.status)}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <p className="text-[16px]">Grand total {formatMoney(grand)}</p>
      </div>
    )
  }

  return (
    <div className="grid min-w-0 gap-4" data-testid="materials-sheet">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            const form = event.currentTarget
            void run(() => addArea(projectId, new FormData(form))).then((ok) => {
              if (ok) form.reset()
            })
          }}
        >
          <label className="grid gap-1 text-[13px] text-ink-2">
            Area name
            <input name="name" required placeholder="Dresser area" />
          </label>
          <Button type="submit" disabled={pending}>Add area</Button>
        </form>
        <Button type="button" tone="surface" onClick={() => setImportOpen(true)}>Import</Button>
      </div>
      <p className="text-[13px] text-ink-3">Tab, Enter and the arrow keys move between cells. Paste rows copied from Excel into the table.</p>
      {selected.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-[24px] bg-surface p-3 shadow-[var(--shadow)]">
          <span className="text-[13px] text-ink-2">{selected.length} selected</span>
          <Button type="button" tone="surface" disabled={pending} onClick={() => void run(() => updateManyMaterials(projectId, selected, { status: "ordered" }))}>
            Mark ordered
          </Button>
          <Button type="button" tone="surface" disabled={pending} onClick={() => void run(() => updateManyMaterials(projectId, selected, { status: "delivered" }))}>
            Mark delivered
          </Button>
          <label className="text-[13px] text-ink-2">
            Move to area
            <select className="ml-2" aria-label="Move to area" value={moveArea} onChange={(event) => setMoveArea(event.target.value)}>
              <option value="">No area</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>{area.name}</option>
              ))}
            </select>
          </label>
          <Button type="button" tone="quiet" disabled={pending} onClick={() => void run(() => updateManyMaterials(projectId, selected, { area_id: moveArea || null }))}>
            Move
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={() => {
              const supplierIds = [...new Set(selectedItems.map((item) => item.supplier_id).filter((id): id is string => Boolean(id)))]
              setOrderForm({
                supplierId: supplierIds.length === 1 ? supplierIds[0] : "",
                reference: "",
                vat: "0",
                vatIncluded: false,
                delivery: "0",
                paidWith: "",
                status: "ordered",
                expected: "",
              })
              setOrdering(true)
            }}
          >
            Group into an order
          </Button>
        </div>
      ) : null}
      <div
        className="min-w-0 max-w-full overflow-x-auto rounded-[28px] bg-surface shadow-[var(--shadow)]"
        onPaste={(event) => {
          const text = event.clipboardData.getData("text/plain")
          if (!text.includes("\t") && !text.includes("\n")) return
          const table = parseTable(text, text.includes("\t") ? "\t" : ",")
          if (table.length === 0) return
          event.preventDefault()
          const header = headerMatchCount(table[0] ?? []) >= 2
          const mapped = header ? guessMapping(table[0] ?? []) : pasteMapping
          const plan = planImport(table, mapped, header)
          const area = areas.find((item) => item.id === focusArea)
          if (area && plan[0] && !plan[0].area) plan[0] = { ...plan[0], area: area.name }
          void run(() => importMaterials(projectId, plan))
        }}
      >
        <table className="min-w-[1500px] border-collapse text-left" onKeyDown={onTableKey} onFocusCapture={(event) => {
          const area = event.target instanceof HTMLElement ? event.target.closest("tr")?.dataset.area : undefined
          if (area !== undefined) setFocusArea(area || null)
        }}>
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.08em] text-ink-3">
              <th className="px-2 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all items"
                  checked={items.length > 0 && items.every((item) => selected.includes(item.id))}
                  onChange={(event) => setSelected(event.target.checked ? items.map((item) => item.id) : [])}
                />
              </th>
              {["Item", "Spec / cut sizes", "Qty", "Unit £", "Total £", "Actual £", "Supplier", "Link", "Notes", "Lead time", "Priority", "Status", "Ordered", "Expected", "Delivered", ""].map((label) => (
                <th key={label || "actions"} className="px-2 py-3 font-medium">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {laidOut.map(({ group, start }) => {
              const open = !collapsed.includes(group.id)
              const subtotal = group.items.filter((item) => item.status !== "cancelled").reduce((sum, item) => sum + item.line_total, 0)
              return (
                <GroupRows
                  key={group.id || "none"}
                  group={group}
                  open={open}
                  subtotal={subtotal}
                  projectId={projectId}
                  suppliers={suppliers}
                  orders={orders}
                  selected={selected}
                  pending={pending}
                  draft={draftFor(group.id)}
                  rowStart={start}
                  onToggle={() => setCollapsed((current) => current.includes(group.id) ? current.filter((id) => id !== group.id) : [...current, group.id])}
                  onSelect={(id, checked) => setSelected((current) => checked ? [...current, id] : current.filter((item) => item !== id))}
                  onCommit={commit}
                  onDraft={(patch) => setDraft(group.id, patch)}
                  onSubmit={() => void submitDraft(group.id)}
                  onRename={(name) => void run(() => renameArea(projectId, group.id, name))}
                  onDropItem={(materialId, beforeId) => void run(() => placeMaterial(projectId, materialId, group.id || null, beforeId))}
                  onDropArea={(areaId) => {
                    if (!group.id || areaId === group.id) return
                    void run(() => placeArea(projectId, areaId, group.id))
                  }}
                  onDuplicate={(id) => void run(() => duplicateMaterial(projectId, id))}
                  onRemove={(item) => {
                    void deleteMaterial(projectId, item.id).then((result) => {
                      if (!result.ok) {
                        toast(result.message)
                        return
                      }
                      toast("Item removed.", {
                        label: "Undo",
                        run: () => {
                          void restoreMaterial(projectId, item).then((restored) => {
                            toast(restored.message)
                            if (restored.ok) router.refresh()
                          })
                        },
                      })
                      router.refresh()
                    })
                  }}
                />
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[16px]">Grand total {formatMoney(grand)}</p>
      {items.length === 0 ? <p className="text-[15px] text-ink-2">No materials yet. Add a row, paste from Excel, or import a spreadsheet.</p> : null}
      <Modal open={importOpen} onOpenChange={setImportOpen} title="Import a spreadsheet" description="Map the columns, then import. Rows with only an item name become areas.">
        <MaterialsImport projectId={projectId} onDone={() => { setImportOpen(false); router.refresh() }} />
      </Modal>
      <Modal open={ordering} onOpenChange={setOrdering} title="Group into an order" description="One checkout with one supplier. The total updates from the items, VAT and delivery.">
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            void run(() => createOrder(projectId, selected, {
              supplier_id: orderForm.supplierId,
              reference: orderForm.reference,
              vat: Number(orderForm.vat) || 0,
              vat_included: orderForm.vatIncluded,
              delivery: Number(orderForm.delivery) || 0,
              paid_with: orderForm.paidWith,
              status: orderForm.status,
              expected_at: orderForm.expected,
            })).then((ok) => {
              if (ok) {
                setOrdering(false)
                setSelected([])
              }
            })
          }}
        >
          <label className="grid gap-1 text-[13px] text-ink-2">
            Supplier
            <select aria-label="Order supplier" required value={orderForm.supplierId} onChange={(event) => setOrderForm((current) => ({ ...current, supplierId: event.target.value }))}>
              <option value="">Choose</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-[13px] text-ink-2">
            Reference
            <input aria-label="Order reference" value={orderForm.reference} onChange={(event) => setOrderForm((current) => ({ ...current, reference: event.target.value }))} />
          </label>
          <label className="grid gap-1 text-[13px] text-ink-2">
            VAT
            <input aria-label="VAT" type="number" min={0} step="0.01" value={orderForm.vat} onChange={(event) => setOrderForm((current) => ({ ...current, vat: event.target.value }))} />
          </label>
          <label className="flex items-center gap-2 text-[14px]">
            <input aria-label="VAT included" type="checkbox" checked={orderForm.vatIncluded} onChange={(event) => setOrderForm((current) => ({ ...current, vatIncluded: event.target.checked }))} />
            VAT included
          </label>
          <label className="grid gap-1 text-[13px] text-ink-2">
            Delivery charge
            <input aria-label="Delivery charge" type="number" min={0} step="0.01" value={orderForm.delivery} onChange={(event) => setOrderForm((current) => ({ ...current, delivery: event.target.value }))} />
          </label>
          <label className="grid gap-1 text-[13px] text-ink-2">
            Paid with
            <input aria-label="Paid with" placeholder="Lloyds or Amex" value={orderForm.paidWith} onChange={(event) => setOrderForm((current) => ({ ...current, paidWith: event.target.value }))} />
          </label>
          <label className="grid gap-1 text-[13px] text-ink-2">
            Status
            <select aria-label="Order status" value={orderForm.status} onChange={(event) => setOrderForm((current) => ({ ...current, status: event.target.value }))}>
              <option value="draft">Draft</option>
              <option value="ordered">Ordered</option>
            </select>
          </label>
          <label className="grid gap-1 text-[13px] text-ink-2">
            Expected
            <input aria-label="Order expected" type="date" value={orderForm.expected} onChange={(event) => setOrderForm((current) => ({ ...current, expected: event.target.value }))} />
          </label>
          <p className="text-[15px]">Total {formatMoney(quotedTotal)}</p>
          <Button type="submit" disabled={pending}>Create order</Button>
        </form>
      </Modal>
    </div>
  )
}

function onTableKey(event: React.KeyboardEvent<HTMLTableElement>) {
  const target = event.target
  if (!(target instanceof HTMLElement) || target.dataset.col == null) return
  if (target instanceof HTMLSelectElement && (event.key === "ArrowUp" || event.key === "ArrowDown")) return
  const row = target.closest("tr")?.dataset.row
  if (row == null) return
  let nextRow = Number(row)
  let nextCol = Number(target.dataset.col)
  if (event.key === "ArrowDown" || (event.key === "Enter" && target.tagName !== "BUTTON")) nextRow += 1
  else if (event.key === "ArrowUp") nextRow -= 1
  else if (event.key === "ArrowRight" && caretAtEnd(target)) nextCol += 1
  else if (event.key === "ArrowLeft" && caretAtStart(target)) nextCol -= 1
  else return
  const next = event.currentTarget.querySelector<HTMLElement>(`tr[data-row="${nextRow}"] [data-col="${nextCol}"]`)
  if (!next) return
  event.preventDefault()
  next.focus()
}

function GroupRows({
  group,
  open,
  subtotal,
  projectId,
  suppliers,
  orders,
  selected,
  pending,
  draft,
  rowStart,
  onToggle,
  onSelect,
  onCommit,
  onDraft,
  onSubmit,
  onRename,
  onDropItem,
  onDropArea,
  onDuplicate,
  onRemove,
}: {
  group: { id: string; name: string; items: MaterialRecord[] }
  open: boolean
  subtotal: number
  projectId: string
  suppliers: SupplierRecord[]
  orders: OrderRecord[]
  selected: string[]
  pending: boolean
  draft: Draft
  rowStart: number
  onToggle: () => void
  onSelect: (id: string, checked: boolean) => void
  onCommit: (id: string, patch: Record<string, unknown>) => Promise<void>
  onDraft: (patch: Partial<Draft>) => void
  onSubmit: () => void
  onRename: (name: string) => void
  onDropItem: (materialId: string, beforeId: string | null) => void
  onDropArea: (areaId: string) => void
  onDuplicate: (id: string) => void
  onRemove: (item: MaterialRecord) => void
}) {
  return (
    <>
      <tr
        className="bg-column"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          const value = event.dataTransfer.getData("text/plain")
          if (value.startsWith("item:")) onDropItem(value.slice(5), null)
          if (value.startsWith("area:")) onDropArea(value.slice(5))
        }}
      >
        <td colSpan={17} className="px-3 py-3">
          <div className="flex flex-wrap items-center gap-3">
            {group.id ? (
              <button type="button" draggable aria-label={`Reorder area ${group.name}`} className="cursor-grab text-ink-3" onDragStart={(event) => event.dataTransfer.setData("text/plain", `area:${group.id}`)}>
                ::
              </button>
            ) : null}
            <button type="button" aria-expanded={open} aria-label={`${open ? "Collapse" : "Expand"} ${group.name}`} onClick={onToggle}>
              {open ? "Hide" : "Show"}
            </button>
            {group.id ? (
              <input
                key={group.name}
                aria-label={`${group.name} name`}
                defaultValue={group.name}
                className="max-w-xs bg-transparent"
                onBlur={(event) => {
                  const next = event.target.value.trim()
                  if (next && next !== group.name) onRename(next)
                }}
              />
            ) : (
              <span className="text-[13px] uppercase tracking-[0.12em]">{group.name}</span>
            )}
            <span className="text-[13px] text-ink-2">Subtotal {formatMoney(subtotal)}</span>
          </div>
        </td>
      </tr>
      {open ? group.items.map((item, index) => (
        <MaterialRow
          key={item.id}
          item={item}
          row={rowStart + index}
          projectId={projectId}
          suppliers={suppliers}
          order={orders.find((entry) => entry.id === item.order_id) ?? null}
          selected={selected.includes(item.id)}
          pending={pending}
          onSelect={onSelect}
          onCommit={onCommit}
          onDropItem={onDropItem}
          onDuplicate={onDuplicate}
          onRemove={onRemove}
        />
      )) : null}
      {open ? (
        <tr data-row={rowStart + group.items.length} data-area={group.id}>
          <td />
          <td className="px-1 py-1">
            <ItemInput
              label={`New item in ${group.name}`}
              value={draft.item}
              col={0}
              commitOnBlur={false}
              onChange={(value) => onDraft({ item: value })}
              onPick={(hit) => onDraft({
                item: hit.item,
                spec: hit.spec,
                unitCost: String(hit.unit_cost),
                link: hit.link,
                supplierId: hit.supplier_id ?? "",
                lead: hit.lead_days == null ? "" : String(hit.lead_days),
              })}
              onCommit={() => onSubmit()}
            />
          </td>
          <td className="px-1 py-1"><input aria-label={`New spec in ${group.name}`} data-col={1} value={draft.spec} onChange={(event) => onDraft({ spec: event.target.value })} /></td>
          <td className="px-1 py-1"><input aria-label={`New quantity in ${group.name}`} data-col={2} value={draft.quantity} onChange={(event) => onDraft({ quantity: event.target.value })} onKeyDown={(event) => { if (event.key === "Enter") onSubmit() }} /></td>
          <td className="px-1 py-1"><input aria-label={`New unit cost in ${group.name}`} data-col={3} value={draft.unitCost} onChange={(event) => onDraft({ unitCost: event.target.value })} /></td>
          <td />
          <td />
          <td className="px-1 py-1">
            <select aria-label={`New supplier in ${group.name}`} data-col={5} value={draft.supplierId} onChange={(event) => onDraft({ supplierId: event.target.value })}>
              <option value="">No supplier</option>
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
          </td>
          <td className="px-1 py-1"><input aria-label={`New link in ${group.name}`} data-col={6} value={draft.link} onChange={(event) => onDraft({ link: event.target.value })} /></td>
          <td className="px-1 py-1"><input aria-label={`New notes in ${group.name}`} data-col={7} value={draft.notes} onChange={(event) => onDraft({ notes: event.target.value })} /></td>
          <td className="px-1 py-1"><input aria-label={`New lead time in ${group.name}`} data-col={8} value={draft.lead} onChange={(event) => onDraft({ lead: event.target.value })} /></td>
          <td className="px-1 py-1">
            <select aria-label={`New priority in ${group.name}`} data-col={9} value={draft.priority} onChange={(event) => onDraft({ priority: event.target.value === "high" ? "high" : "normal" })}>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </td>
          <td colSpan={6} className="px-2">
            <Button type="button" tone="quiet" aria-label={`Add item in ${group.name}`} onClick={onSubmit}>Add item</Button>
          </td>
        </tr>
      ) : null}
    </>
  )
}

function MaterialRow({
  item,
  row,
  projectId,
  suppliers,
  order,
  selected,
  pending,
  onSelect,
  onCommit,
  onDropItem,
  onDuplicate,
  onRemove,
}: {
  item: MaterialRecord
  row: number
  projectId: string
  suppliers: SupplierRecord[]
  order: OrderRecord | null
  selected: boolean
  pending: boolean
  onSelect: (id: string, checked: boolean) => void
  onCommit: (id: string, patch: Record<string, unknown>) => Promise<void>
  onDropItem: (materialId: string, beforeId: string | null) => void
  onDuplicate: (id: string) => void
  onRemove: (item: MaterialRecord) => void
}) {
  const late = item.status === "late" || (item.status === "ordered" && item.expected_at != null && item.expected_at.slice(0, 10) < londonToday())
  const link = safeHttpUrl(item.link)
  return (
    <tr
      data-row={row}
      data-area={item.area_id ?? ""}
      className={`${late ? "bg-danger/10" : ""} ${item.status === "cancelled" ? "opacity-60" : ""}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        const value = event.dataTransfer.getData("text/plain")
        if (value.startsWith("item:")) onDropItem(value.slice(5), item.id)
      }}
    >
      <td className="px-2">
        <input type="checkbox" aria-label={`Select ${item.item}`} checked={selected} onChange={(event) => onSelect(item.id, event.target.checked)} />
      </td>
      <td className="px-1 py-1">
        <div className="flex items-center gap-1">
          <button type="button" draggable aria-label={`Reorder ${item.item}`} className="cursor-grab px-1 text-ink-3" onDragStart={(event) => event.dataTransfer.setData("text/plain", `item:${item.id}`)}>::</button>
          <ItemInput label={`${item.item} item`} value={item.item} col={0} onChange={() => undefined} onCommit={(value) => { if (value.trim() && value.trim() !== item.item) void onCommit(item.id, { item: value.trim() }) }} onPick={(hit) => void onCommit(item.id, { item: hit.item, spec: hit.spec, unit_cost: hit.unit_cost, link: hit.link, supplier_id: hit.supplier_id, lead_days: hit.lead_days })} />
        </div>
        {order ? <Link className="text-[12px] text-brand" href={`/studio/projects/${projectId}?tab=orders`}>View order{order.reference ? ` ${order.reference}` : ""}</Link> : null}
      </td>
      <td className="px-1 py-1"><Cell label={`${item.item} spec`} value={item.spec} col={1} onCommit={(value) => value !== item.spec && void onCommit(item.id, { spec: value })} /></td>
      <td className="px-1 py-1"><Cell label={`${item.item} quantity`} value={String(item.quantity)} col={2} onCommit={(value) => commitNumber(item, "quantity", value, onCommit)} /></td>
      <td className="px-1 py-1"><Cell label={`${item.item} unit cost`} value={String(item.unit_cost)} col={3} onCommit={(value) => commitNumber(item, "unit_cost", value, onCommit)} /></td>
      <td className="px-2">{formatMoney(item.line_total)}</td>
      <td className="px-1 py-1"><Cell label={`${item.item} actual cost`} value={item.actual_cost == null ? "" : String(item.actual_cost)} col={4} onCommit={(value) => {
        const next = value.trim() === "" ? null : Number(value)
        if (next != null && (!Number.isFinite(next) || next < 0)) return
        if (next !== item.actual_cost) void onCommit(item.id, { actual_cost: next })
      }} /></td>
      <td className="px-1 py-1">
        <select aria-label={`${item.item} supplier`} data-col={5} value={item.supplier_id ?? ""} onChange={(event) => void onCommit(item.id, { supplier_id: event.target.value || null })}>
          <option value="">No supplier</option>
          {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
        </select>
      </td>
      <td className="px-1 py-1">
        <Cell label={`${item.item} link`} value={item.link} col={6} onCommit={(value) => value !== item.link && void onCommit(item.id, { link: value })} />
        {link ? <a className="text-[12px] text-brand" href={link} target="_blank" rel="noreferrer">Open</a> : null}
      </td>
      <td className="px-1 py-1"><Cell label={`${item.item} notes`} value={item.notes} col={7} onCommit={(value) => value !== item.notes && void onCommit(item.id, { notes: value })} /></td>
      <td className="px-1 py-1"><Cell label={`${item.item} lead time`} value={item.lead_days == null ? "" : String(item.lead_days)} col={8} onCommit={(value) => {
        if (!value.trim()) {
          if (item.lead_days != null) void onCommit(item.id, { lead_days: null })
          return
        }
        const next = Number(value)
        if (!Number.isInteger(next) || next < 0 || next === item.lead_days) return
        void onCommit(item.id, { lead_days: next })
      }} /></td>
      <td className="px-1 py-1">
        <select aria-label={`${item.item} priority`} data-col={9} value={item.priority} onChange={(event) => void onCommit(item.id, { priority: event.target.value === "high" ? "high" : "normal" })}>
          <option value="normal">Normal</option>
          <option value="high">High</option>
        </select>
      </td>
      <td className="px-1 py-1">
        <select aria-label={`${item.item} status`} data-col={10} value={item.status} onChange={(event) => void onCommit(item.id, { status: event.target.value })}>
          {statuses.map((status) => <option key={status} value={status}>{materialStatusLabel(status)}</option>)}
        </select>
      </td>
      <td className="px-1 py-1"><input aria-label={`${item.item} ordered`} data-col={11} type="date" value={day(item.ordered_at)} onChange={(event) => void onCommit(item.id, { ordered_at: event.target.value || null })} /></td>
      <td className="px-1 py-1"><input aria-label={`${item.item} expected`} data-col={12} type="date" value={day(item.expected_at)} onChange={(event) => void onCommit(item.id, { expected_at: event.target.value || null })} /></td>
      <td className="px-1 py-1"><input aria-label={`${item.item} delivered`} data-col={13} type="date" value={day(item.delivered_at)} onChange={(event) => void onCommit(item.id, { delivered_at: event.target.value || null })} /></td>
      <td className="px-2">
        <button type="button" className="text-[13px] text-ink" disabled={pending} aria-label={`Duplicate ${item.item}`} onClick={() => onDuplicate(item.id)}>Duplicate</button>
        <button type="button" className="ml-2 text-[13px] text-ink-2" disabled={pending} aria-label={`Remove ${item.item}`} onClick={() => onRemove(item)}>Remove</button>
      </td>
    </tr>
  )
}

function commitNumber(item: MaterialRecord, key: "quantity" | "unit_cost", raw: string, onCommit: (id: string, patch: Record<string, unknown>) => Promise<void>) {
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0 || value === item[key]) return
  void onCommit(item.id, { [key]: value })
}

function Cell({ label, value, col, onCommit }: { label: string; value: string; col: number; onCommit: (value: string) => void }) {
  const [draft, setDraft] = useState(value)
  const [seen, setSeen] = useState(value)
  if (seen !== value) {
    setSeen(value)
    setDraft(value)
  }
  return (
    <input
      aria-label={label}
      data-col={col}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => onCommit(draft)}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setDraft(value)
          event.currentTarget.blur()
        }
      }}
    />
  )
}

function ItemInput({
  label,
  value,
  col,
  onChange,
  onCommit,
  onPick,
  commitOnBlur = true,
}: {
  label: string
  value: string
  col: number
  onChange: (value: string) => void
  onCommit: (value: string) => void
  onPick: (hit: MaterialSuggestion) => void
  commitOnBlur?: boolean
}) {
  const [draft, setDraft] = useState(value)
  const [seen, setSeen] = useState(value)
  const [focused, setFocused] = useState(false)
  const [hits, setHits] = useState<MaterialSuggestion[]>([])
  if (seen !== value) {
    setSeen(value)
    setDraft(value)
  }
  useEffect(() => {
    if (!focused || draft.trim().length < 2) return undefined
    const timer = window.setTimeout(() => {
      void suggestMaterials(draft.trim()).then(setHits)
    }, 200)
    return () => window.clearTimeout(timer)
  }, [draft, focused])

  return (
    <div className="relative">
      <input
        aria-label={label}
        data-col={col}
        value={draft}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false)
          if (commitOnBlur) onCommit(draft)
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") onCommit(draft)
        }}
        onChange={(event) => {
          setDraft(event.target.value)
          onChange(event.target.value)
        }}
      />
      {focused && hits.length > 0 ? (
        <ul role="listbox" aria-label="Suggestions" className="absolute z-20 mt-1 max-h-48 w-64 overflow-auto rounded-2xl bg-surface p-1 shadow-[var(--shadow)]">
          {hits.map((hit) => (
            <li key={`${hit.item}-${hit.supplier_name}-${hit.unit_cost}`}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                className="w-full rounded-xl px-2 py-2 text-left text-[13px] hover:bg-column"
                onMouseDown={(event) => {
                  event.preventDefault()
                  setDraft(hit.item)
                  setHits([])
                  onPick(hit)
                }}
              >
                {hit.item}
                <span className="mt-1 block text-[12px] text-ink-3">{[hit.supplier_name, formatMoney(hit.unit_cost)].filter(Boolean).join(" · ")}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
