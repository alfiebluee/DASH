export function browserOrigin(request: { url: string; headers: Headers }): string {
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host")?.trim()
  if (!host) return new URL(request.url).origin
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "http"
  return `${proto}://${host}`
}
