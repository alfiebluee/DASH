import { moneyNumber } from "@/lib/money"

export const columnFields = [
  "item",
  "spec",
  "quantity",
  "unit_cost",
  "line_total",
  "supplier",
  "link",
  "notes",
  "lead_time",
  "priority",
  "status",
  "ordered",
  "expected",
  "delivered",
  "ignore",
] as const

export type ColumnField = (typeof columnFields)[number]

export type MaterialStatus = "to_order" | "ordered" | "delivered" | "late" | "cancelled"

export type PlannedItem = {
  item: string
  spec: string
  quantity: number
  unit_cost: number
  supplier_name: string
  link: string
  notes: string
  lead_days: number | null
  priority: "normal" | "high"
  status: MaterialStatus
  ordered_at: string | null
  expected_at: string | null
  delivered_at: string | null
}

export type PlannedGroup = {
  area: string | null
  items: PlannedItem[]
}

const detectors: Array<[ColumnField, RegExp]> = [
  ["line_total", /total/i],
  ["quantity", /qty|quantity/i],
  ["unit_cost", /unit/i],
  ["lead_time", /lead/i],
  ["priority", /priority/i],
  ["supplier", /supplier/i],
  ["expected", /expected/i],
  ["delivered", /delivered/i],
  ["ordered", /^ordered$/i],
  ["status", /status/i],
  ["notes", /note/i],
  ["link", /link|url/i],
  ["spec", /spec|cut/i],
  ["item", /item|description|product|material/i],
]

export function parseTable(text: string, delimiter: "," | "\t"): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false
  const source = text.replace(/^\uFEFF/, "")
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          cell += '"'
          index += 1
        } else {
          quoted = false
        }
      } else {
        cell += char
      }
      continue
    }
    if (char === '"') {
      quoted = true
      continue
    }
    if (char === delimiter) {
      row.push(cell.trim())
      cell = ""
      continue
    }
    if (char === "\n" || char === "\r") {
      if (char === "\r" && source[index + 1] === "\n") index += 1
      row.push(cell.trim())
      if (row.some((value) => value !== "")) rows.push(row)
      row = []
      cell = ""
      continue
    }
    cell += char
  }
  row.push(cell.trim())
  if (row.some((value) => value !== "")) rows.push(row)
  return rows
}

export function guessMapping(header: string[]): ColumnField[] {
  const used = new Set<ColumnField>()
  return header.map((cell) => {
    const text = cell.trim()
    if (!text) return "ignore"
    for (const [field, pattern] of detectors) {
      if (field !== "ignore" && used.has(field)) continue
      if (pattern.test(text)) {
        used.add(field)
        return field
      }
    }
    return "ignore"
  })
}

export function headerMatchCount(header: string[]): number {
  return guessMapping(header).filter((field) => field !== "ignore").length
}

export function leadDaysFromText(value: string): number | null {
  const text = value.trim().toLowerCase()
  if (!text) return null
  if (text.includes("next day")) return 1
  const range = text.match(/(\d+)\s*-\s*(\d+)/)
  if (range) return Number(range[2])
  const days = text.match(/(\d+)/)
  if (days) return Number(days[1])
  return null
}

export function isHighPriority(value: string): boolean {
  return /high\s*priority|^high$/i.test(value.trim())
}

export function statusFromText(value: string): MaterialStatus | null {
  const text = value.trim().toLowerCase()
  if (text === "ordered") return "ordered"
  if (text === "delivered" || text === "delivery") return "delivered"
  if (text === "late") return "late"
  if (text === "cancelled" || text === "canceled") return "cancelled"
  if (text === "to order" || text === "to_order" || text === "to-order") return "to_order"
  return null
}

export function parseMoneyCell(value: string): number {
  const cleaned = value.replace(/[£,\s]/g, "")
  if (!cleaned) return 0
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? moneyNumber(Math.max(parsed, 0)) : 0
}

export function parseSheetDate(value: string): string | null {
  const text = value.trim()
  if (!text) return null
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const uk = text.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})$/)
  if (uk) {
    const year = uk[3].length === 2 ? `20${uk[3]}` : uk[3]
    return `${year}-${uk[2].padStart(2, "0")}-${uk[1].padStart(2, "0")}`
  }
  return null
}

export function safeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.protocol === "https:" || url.protocol === "http:") return url.toString()
  } catch {
    return null
  }
  return null
}

function readMapped(row: string[], mapping: ColumnField[]): Partial<Record<ColumnField, string>> {
  const record: Partial<Record<ColumnField, string>> = {}
  mapping.forEach((field, index) => {
    if (field === "ignore") return
    const value = row[index]?.trim() ?? ""
    if (!value) return
    record[field] = record[field] ? `${record[field]} ${value}` : value
  })
  return record
}

function isAreaRecord(record: Partial<Record<ColumnField, string>>): boolean {
  const keys = Object.keys(record).filter((key) => key !== "item")
  return Boolean(record.item) && keys.length === 0
}

export function planImport(rows: string[][], mapping: ColumnField[], headerRow: boolean): PlannedGroup[] {
  const source = headerRow ? rows.slice(1) : rows
  const groups: PlannedGroup[] = [{ area: null, items: [] }]
  for (const row of source) {
    const record = readMapped(row, mapping)
    const item = record.item?.trim() ?? ""
    if (!item) continue
    if (isAreaRecord(record)) {
      groups.push({ area: item, items: [] })
      continue
    }
    const quantity = record.quantity ? parseMoneyCell(record.quantity) : 1
    const lineTotal = record.line_total ? parseMoneyCell(record.line_total) : 0
    let unit = record.unit_cost ? parseMoneyCell(record.unit_cost) : 0
    if (unit === 0 && lineTotal > 0 && quantity > 0) unit = moneyNumber(lineTotal / quantity)
    const high = row.some((cell) => isHighPriority(cell)) || isHighPriority(record.priority ?? "")
    const exactOrdered = row.some((cell) => cell.trim().toLowerCase() === "ordered")
    const deliveredAt = parseSheetDate(record.delivered ?? "")
    const orderedAt = parseSheetDate(record.ordered ?? "")
    let status = statusFromText(record.status ?? "") ?? "to_order"
    if (exactOrdered && status === "to_order") status = "ordered"
    if (orderedAt && status === "to_order") status = "ordered"
    if (deliveredAt) status = "delivered"
    const current = groups[groups.length - 1]
    current.items.push({
      item,
      spec: record.spec ?? "",
      quantity,
      unit_cost: unit,
      supplier_name: record.supplier ?? "",
      link: record.link ?? "",
      notes: record.notes ?? "",
      lead_days: leadDaysFromText(record.lead_time ?? ""),
      priority: high ? "high" : "normal",
      status,
      ordered_at: orderedAt,
      expected_at: parseSheetDate(record.expected ?? ""),
      delivered_at: deliveredAt,
    })
  }
  return groups.filter((group) => group.area || group.items.length > 0)
}

export const pasteMapping: ColumnField[] = [
  "item",
  "spec",
  "quantity",
  "unit_cost",
  "supplier",
  "link",
  "notes",
  "lead_time",
  "priority",
  "status",
]
