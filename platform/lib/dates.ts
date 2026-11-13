export function londonToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

export function diffDays(later: string, earlier: string): number {
  const end = Date.parse(`${later}T00:00:00Z`)
  const start = Date.parse(`${earlier}T00:00:00Z`)
  return Math.round((end - start) / 86_400_000)
}

export function addDays(iso: string, days: number): string {
  const date = new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000)
  return date.toISOString().slice(0, 10)
}

export function mondayOf(iso: string): string {
  const date = new Date(Date.parse(`${iso}T00:00:00Z`))
  const day = date.getUTCDay()
  const offset = day === 0 ? -6 : 1 - day
  return addDays(iso, offset)
}

export function formatShort(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number)
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1))
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(date)
}

export function deadlinePhrase(due: string, today: string): string {
  const days = diffDays(due, today)
  const when = formatShort(due)
  if (days === 0) return `Due today · ${when}`
  if (days === 1) return `1 day to the next deadline · ${when}`
  if (days > 1) return `${days} days to the next deadline · ${when}`
  if (days === -1) return `1 day overdue · ${when}`
  return `${Math.abs(days)} days overdue · ${when}`
}
