export function moneyNumber(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(moneyNumber(value))
}

export function orderTotal(input: { itemsTotal: number; vat: number; vatIncluded: boolean; delivery: number }): number {
  const base = moneyNumber(input.itemsTotal + input.delivery)
  return input.vatIncluded ? base : moneyNumber(base + input.vat)
}

export function agreedTotal(amounts: number[]): number {
  return moneyNumber(amounts.reduce((sum, amount) => sum + amount, 0))
}

export function materialsLineAmount(locked: boolean, stored: number, planned: number): number {
  return locked ? stored : planned
}

export function contingencyPosition(input: {
  materialsLine: number
  materialsActual: number
  delivery: number
  contingency: number
}): { remaining: number; percentUsed: number } {
  const overrun = Math.max(moneyNumber(input.materialsActual + input.delivery - input.materialsLine), 0)
  const used = Math.min(overrun, input.contingency)
  const remaining = Math.max(moneyNumber(input.contingency - used), 0)
  const percentUsed = input.contingency === 0 ? 0 : moneyNumber((used / input.contingency) * 100)
  return { remaining, percentUsed }
}

export function contingencyIsHot(percentUsed: number): boolean {
  return percentUsed > 90
}
