import { addDays, differenceInCalendarDays, format, parseISO, startOfDay, startOfWeek } from "date-fns"

export function dayIso(date: Date): string {
  return format(startOfDay(date), "yyyy-MM-dd")
}

export function isoOffset(today: Date, days: number): string {
  return format(addDays(startOfDay(today), days), "yyyy-MM-dd")
}

export function shortDate(iso: string): string {
  return format(parseISO(iso), "d MMM")
}

export function weekdayLabel(date: Date, withYear = false): string {
  return format(date, withYear ? "EEEE d MMMM yyyy" : "EEEE d MMMM").toUpperCase()
}

export function greetingFor(date: Date): "Good morning" | "Good afternoon" | "Good evening" {
  const hour = date.getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

const SMALL_NUMBERS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"]
const COUNT_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"]

export function smallNumberWord(value: number): string {
  return SMALL_NUMBERS[value] ?? String(value)
}

export function countWord(value: number): string {
  return COUNT_WORDS[value] ?? String(value)
}

export function daysFromToday(iso: string, today: Date): number {
  return differenceInCalendarDays(parseISO(iso), startOfDay(today))
}

export function shiftIso(iso: string, days: number): string {
  return format(addDays(parseISO(iso), days), "yyyy-MM-dd")
}

export function weekStartMonday(date: Date): Date {
  return startOfWeek(startOfDay(date), { weekStartsOn: 1 })
}

export function fortnightDays(today: Date): Date[] {
  const start = startOfDay(today)
  return Array.from({ length: 14 }, (_, index) => addDays(start, index))
}
