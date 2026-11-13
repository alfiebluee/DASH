"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export function ViewSwitch() {
  const pathname = usePathname()
  const dashboard = pathname === "/studio"
  const manage = pathname.startsWith("/studio/projects")
  return (
    <div className="inline-flex rounded-full bg-surface p-1 shadow-[var(--shadow)]" aria-label="View">
      <Link href="/studio" aria-current={dashboard ? "page" : undefined} className={`rounded-full px-4 py-2 text-[14px] ${dashboard ? "bg-brand text-surface" : "text-ink-2"}`}>
        Dashboard
      </Link>
      <Link href="/studio/projects" aria-current={manage ? "page" : undefined} className={`rounded-full px-4 py-2 text-[14px] ${manage ? "bg-brand text-surface" : "text-ink-2"}`}>
        Manage
      </Link>
    </div>
  )
}
