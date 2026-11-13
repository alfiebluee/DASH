import Link from "next/link"

import { SignOut } from "@/components/SignOut"

export function PortalHeader({ name }: { name: string }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <Link href="/portal" className="text-[11px] uppercase tracking-[0.18em] text-ink-3">
          Portal
        </Link>
        <p className="mt-1 text-[15px]">{name}</p>
      </div>
      <SignOut />
    </header>
  )
}
