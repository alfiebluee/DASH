export type Role = "owner" | "viewer" | "client"

export function redirectFor(pathname: string, role: Role | null): string | null {
  const studio = pathname === "/studio" || pathname.startsWith("/studio/")
  const portal = pathname === "/portal" || pathname.startsWith("/portal/")
  const login = pathname === "/login"
  if (pathname.startsWith("/auth/")) return null

  if (!role) {
    if (studio || portal || pathname === "/") return "/login"
    return null
  }

  if (role === "owner" || role === "viewer") {
    if (login || portal || pathname === "/") return "/studio"
    return null
  }

  if (login || studio || pathname === "/") return "/portal"
  return null
}
