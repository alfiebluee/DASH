"use client"

export default function SuppliersError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main>
      <h1 className="text-[32px] font-light">Suppliers did not load</h1>
      <button type="button" onClick={reset} className="mt-6 rounded-full bg-brand px-4 py-2 text-[14px] text-white">
        Try again
      </button>
    </main>
  )
}
