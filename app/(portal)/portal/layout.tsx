import { redirect } from "next/navigation"

import { PortalHeader } from "@/components/portal-header"
import { getSession } from "@/lib/session"

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect("/login")
  if (session.role === "owner") redirect("/studio")

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-6 sm:px-5 sm:py-8">
      <PortalHeader name={session.name} />
      {children}
    </div>
  )
}
