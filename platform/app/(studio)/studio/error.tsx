"use client"

export default function StudioError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main>
      <h1 className="text-[32px] font-light">Something went wrong</h1>
      <p className="mt-2 text-[15px] text-ink-2">The studio page did not load.</p>
      <button type="button" onClick={reset} className="mt-6 rounded-full bg-brand px-4 py-2 text-[14px] text-white">
        Try again
      </button>
    </main>
  )
}
