"use client"

import { useState } from "react"

import { importMaterials } from "@/app/(studio)/studio/projects/[id]/materials-actions"
import { useToast } from "@/components/toast-provider"
import { Button } from "@/components/ui/button"
import { columnFields, guessMapping, headerMatchCount, planImport, parseTable, type ColumnField } from "@/lib/sheets"

type Xlsx = {
  read: (data: ArrayBuffer, options: { type: "array" }) => { SheetNames: string[]; Sheets: Record<string, unknown> }
  utils: { sheet_to_json: (sheet: unknown, options: { header: 1; raw: false; defval: string }) => unknown[][] }
}

declare global {
  interface Window {
    XLSX?: Xlsx
  }
}

const fieldLabels: Record<ColumnField, string> = {
  item: "Item",
  spec: "Spec",
  quantity: "Qty",
  unit_cost: "Unit £",
  line_total: "Total £",
  supplier: "Supplier",
  link: "Link",
  notes: "Notes",
  lead_time: "Lead time",
  priority: "Priority",
  status: "Status",
  ordered: "Ordered",
  expected: "Expected",
  delivered: "Delivered",
  ignore: "Ignore",
}

function loadSheetJs(): Promise<Xlsx> {
  if (window.XLSX) return Promise.resolve(window.XLSX)
  return new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"
    script.async = true
    script.onload = () => {
      if (window.XLSX) resolve(window.XLSX)
      else reject(new Error("missing"))
    }
    script.onerror = () => reject(new Error("cdn"))
    document.head.appendChild(script)
  })
}

async function rowsFromFile(file: File): Promise<string[][]> {
  const csv = file.name.toLowerCase().endsWith(".csv") || file.type.includes("csv") || file.type === "text/plain"
  if (csv) return parseTable(await file.text(), ",")
  const xlsx = await loadSheetJs()
  const book = xlsx.read(await file.arrayBuffer(), { type: "array" })
  const sheet = book.Sheets[book.SheetNames[0]]
  const grid = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" })
  return grid.map((row) => row.map((cell) => String(cell ?? "").trim()))
}

export function MaterialsImport({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const toast = useToast()
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<ColumnField[]>([])
  const [headerRow, setHeaderRow] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const plan = rows.length > 0 ? planImport(rows, mapping, headerRow) : []
  const items = plan.reduce((sum, group) => sum + group.items.length, 0)
  const areas = plan.filter((group) => group.area).length
  const itemMapped = mapping.includes("item")

  return (
    <div className="grid gap-4">
      <label className="grid gap-1 text-[13px] text-ink-2">
        Spreadsheet
        <input
          aria-label="Spreadsheet"
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(event) => {
            const file = event.target.files?.[0]
            setError("")
            if (!file) return
            void rowsFromFile(file)
              .then((grid) => {
                const headings = headerMatchCount(grid[0] ?? []) >= 2
                setRows(grid)
                setHeaderRow(headings)
                setMapping(headings ? guessMapping(grid[0] ?? []) : guessMapping([]))
              })
              .catch(() => setError("That file could not be read. Save it as CSV and try again."))
          }}
        />
      </label>
      {error ? <p className="text-[14px] text-danger">{error}</p> : null}
      {rows.length > 0 ? (
        <>
          <label className="flex items-center gap-2 text-[14px]">
            <input
              type="checkbox"
              checked={headerRow}
              aria-label="First row is headings"
              onChange={(event) => {
                const next = event.target.checked
                setHeaderRow(next)
                if (next) setMapping(guessMapping(rows[0] ?? []))
              }}
            />
            First row is headings
          </label>
          <div className="grid gap-2">
            {(headerRow ? rows[0] : rows[0]?.map((_, index) => `Column ${index + 1}`))?.map((label, index) => (
              <label key={`${label}-${index}`} className="grid grid-cols-[1fr_9rem] items-center gap-2 text-[13px]">
                <span className="truncate text-ink-2">{label || `Column ${index + 1}`}</span>
                <select
                  aria-label={`Map ${label || `column ${index + 1}`}`}
                  value={mapping[index] ?? "ignore"}
                  onChange={(event) => {
                    const next = [...mapping]
                    next[index] = event.target.value as ColumnField
                    setMapping(next)
                  }}
                >
                  {columnFields.map((field) => (
                    <option key={field} value={field}>
                      {fieldLabels[field]}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <p className="text-[14px] text-ink-2">
            {areas} area{areas === 1 ? "" : "s"}, {items} item{items === 1 ? "" : "s"}. A row with only an item name becomes an area.
          </p>
          <Button
            type="button"
            disabled={pending || !itemMapped || (items === 0 && areas === 0)}
            onClick={() => {
              setPending(true)
              void importMaterials(projectId, plan).then((result) => {
                setPending(false)
                toast(result.message)
                if (result.ok) onDone()
              })
            }}
          >
            Import rows
          </Button>
        </>
      ) : (
        <p className="text-[14px] text-ink-2">CSV is read here. Excel files load SheetJS from the SheetJS CDN.</p>
      )}
    </div>
  )
}
