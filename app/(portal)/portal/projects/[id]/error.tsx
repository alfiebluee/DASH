"use client"

export default function PortalProjectError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mt-8">
      <h1 className="text-[32px] font-light">This project did not load</h1>
      <p className="mt-2 text-[14px] text-ink-3">{error.digest ?? "Try again."}</p>
      <button type="button" onClick={reset} className="mt-6 w-full rounded-full bg-brand px-4 py-3 text-[14px] text-surface sm:w-fit">
        Try again
      </button>
    </main>
  )
}
