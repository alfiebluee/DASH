import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { expect, it } from "vitest"

import { agreedTotal, contingencyIsHot, contingencyPosition, materialsLineAmount, orderTotal } from "../lib/money"
import { guessMapping, headerMatchCount, leadDaysFromText, parseTable, planImport } from "../lib/sheets"

it("reads lead times the way the sheets write them", () => {
  expect(leadDaysFromText("Next Day")).toBe(1)
  expect(leadDaysFromText("1-3 working days")).toBe(3)
  expect(leadDaysFromText("7 days")).toBe(7)
  expect(leadDaysFromText("")).toBeNull()
})

it("turns a sheet into areas and items", () => {
  const text = readFileSync(resolve(process.cwd(), "tests/fixtures/sample-materials.csv"), "utf8")
  const rows = parseTable(text, ",")
  expect(headerMatchCount(rows[0])).toBeGreaterThan(2)
  const mapping = guessMapping(rows[0])
  const plan = planImport(rows, mapping, true)
  expect(plan.map((group) => group.area)).toEqual(["Dresser Area", "TV Wall"])
  const cls = plan[0]?.items[0]
  expect(cls).toMatchObject({
    item: "CLS timber",
    spec: "38x63",
    quantity: 4,
    unit_cost: 8.5,
    supplier_name: "Wickes",
    link: "https://wickes.example/cls",
    lead_days: 1,
    priority: "high",
    status: "ordered",
  })
  expect(plan[0]?.items[1]).toMatchObject({ item: "Emulsion", lead_days: 7, priority: "normal", status: "to_order", quantity: 2, unit_cost: 12 })
  expect(plan[1]?.items[0]).toMatchObject({ item: "Bracket", supplier_name: "Screenmoove", lead_days: 3, unit_cost: 20 })
})

it("totals an order with VAT on top and VAT included", () => {
  expect(orderTotal({ itemsTotal: 100, vat: 20, vatIncluded: false, delivery: 10 })).toBe(130)
  expect(orderTotal({ itemsTotal: 120, vat: 20, vatIncluded: true, delivery: 5 })).toBe(125)
})

it("matches the Shark Beauty budget split", () => {
  expect(agreedTotal([2500, 1200, 6448, 1000])).toBe(11148)
  expect(materialsLineAmount(false, 0, 6448)).toBe(6448)
  expect(materialsLineAmount(true, 6448, 7000)).toBe(6448)
})

it("warns once contingency is more than 90% used", () => {
  const calm = contingencyPosition({ materialsLine: 1000, materialsActual: 1500, delivery: 0, contingency: 1000 })
  expect(calm.percentUsed).toBe(50)
  expect(contingencyIsHot(calm.percentUsed)).toBe(false)
  const hot = contingencyPosition({ materialsLine: 1000, materialsActual: 1910, delivery: 0, contingency: 1000 })
  expect(hot.percentUsed).toBe(91)
  expect(contingencyIsHot(hot.percentUsed)).toBe(true)
  expect(hot.remaining).toBe(90)
})
