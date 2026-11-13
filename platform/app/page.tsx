import { redirect } from "next/navigation"

import { redirectFor } from "@/lib/routing"
import { getSession } from "@/lib/session"

export default async function Home() {
  const session = await getSession()
  redirect(redirectFor("/", session?.role ?? null) ?? "/login")
}
