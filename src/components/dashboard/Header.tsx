import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { Search } from "lucide-react"
import { NavLink, useNavigate } from "react-router-dom"
import type { Settings } from "../../data/schemas.ts"
import { cn } from "../../lib/cn.ts"
import { greetingFor, weekdayLabel } from "../../lib/dates.ts"
import { useStudioUI } from "../../lib/ui-state.tsx"

export function Header({
  now,
  settings,
  showGreeting,
  withYear = false,
}: {
  now: Date
  settings: Settings
  showGreeting: boolean
  withYear?: boolean
}) {
  const initial = settings.greetingName.slice(0, 1).toUpperCase()
  const ui = useStudioUI()
  const navigate = useNavigate()
  return (
    <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-3">
          {weekdayLabel(now, withYear)}
        </p>
        {showGreeting ? (
          <h1 className="mt-1 text-[32px] font-light leading-none tracking-[-0.025em] text-ink sm:text-[40px] lg:text-[44px]">
            {greetingFor(now)}, {settings.greetingName}
          </h1>
        ) : null}
      </div>
      <div className="flex items-center gap-2 sm:pt-1">
        <nav aria-label="Views" className="flex rounded-full border border-line bg-white/80 p-1 shadow-card">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                "rounded-full px-3.5 py-1.5 text-[13px]",
                isActive ? "bg-white text-ink shadow-sm" : "text-ink-2 hover:text-ink",
              )
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/manage"
            className={({ isActive }) =>
              cn(
                "rounded-full px-3.5 py-1.5 text-[13px]",
                isActive ? "bg-white text-ink shadow-sm" : "text-ink-2 hover:text-ink",
              )
            }
          >
            Manage
          </NavLink>
        </nav>
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white/80 text-ink-2 shadow-card sm:hidden"
          aria-label="Add or find anything"
          onClick={() => ui.setPaletteOpen(true)}
        >
          <Search strokeWidth={1.5} className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="hidden items-center gap-2 whitespace-nowrap rounded-full border border-line bg-white/80 py-1.5 pl-3 pr-1.5 text-[13px] text-ink-3 shadow-card sm:inline-flex"
          aria-label="Add or find anything"
          onClick={() => ui.setPaletteOpen(true)}
        >
          <Search strokeWidth={1.5} className="h-3.5 w-3.5" />
          <span>Add or find anything</span>
          <kbd className="rounded-md bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-ink-3">
            ⌘K
          </kbd>
        </button>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            className="grid h-9 w-9 place-items-center rounded-full bg-ink text-[13px] font-medium text-white"
            aria-label="Account"
          >
            {initial}
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="z-[80] min-w-40 rounded-2xl border border-line bg-white p-1 text-[13px] shadow-lift" align="end">
              <DropdownMenu.Item
                className="rounded-xl px-3 py-1.5 outline-none data-[highlighted]:bg-surface-muted"
                onSelect={() => navigate("/manage?tab=settings")}
              >
                Settings
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  )
}
