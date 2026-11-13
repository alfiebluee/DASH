export function greetingFor(now: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "Europe/London",
    }).format(now),
  )
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export function formatToday(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/London",
  }).formatToParts(now)
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? ""
  const day = parts.find((part) => part.type === "day")?.value ?? ""
  const month = parts.find((part) => part.type === "month")?.value ?? ""
  return `${weekday} ${day} ${month}`.toUpperCase()
}
