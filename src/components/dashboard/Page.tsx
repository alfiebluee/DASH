import type { ReactNode } from "react"

export function Page({ children }: { children: ReactNode }) {
  return <main className="mx-auto w-full max-w-[1344px] px-4 py-5 sm:px-6 sm:py-8">{children}</main>
}

export function BottomSpacer() {
  return <div className="h-8" />
}
