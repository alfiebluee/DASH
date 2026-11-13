"use client"

export default function PortalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mt-10">
      <h1 className="text-[32px] font-light">Something went wrong</h1>
      <button type="button" onClick={reset} className="mt-6 rounded-full bg-brand px-4 py-2 text-[14px] text-white">
        Try again
      </button>
    </main>
  )
}
