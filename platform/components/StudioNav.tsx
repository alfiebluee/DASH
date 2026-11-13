"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Folder, LayoutDashboard, Settings, Truck, Users } from "lucide-react"

const links = [
  { href: "/studio", label: "Dashboard", icon: LayoutDashboard },
  { href: "/studio/projects", label: "Projects", icon: Folder },
  { href: "/studio/clients", label: "Clients", icon: Users },
  { href: "/studio/suppliers", label: "Suppliers", icon: Truck },
  { href: "/studio/settings", label: "Settings", icon: Settings },
]

export function StudioNav() {
  const pathname = usePathname()
  return (
    <nav className="mt-6 flex flex-wrap gap-2 md:flex-col" aria-label="Studio">
      {links.map((link) => {
        const current = link.href === "/studio" ? pathname === "/studio" : pathname === link.href || pathname.startsWith(`${link.href}/`)
        const Icon = link.icon
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current ? "page" : undefined}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-[14px] ${current ? "bg-surface text-ink shadow-[var(--shadow)]" : "text-ink-2 hover:text-ink"}`}
          >
            <Icon aria-hidden="true" size={16} />
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
