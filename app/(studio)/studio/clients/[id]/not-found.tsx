import Link from "next/link"

export default function ClientNotFound() {
  return (
    <main>
      <h1 className="text-[32px] font-light">Client not found</h1>
      <Link href="/studio/clients" className="mt-6 inline-flex rounded-full bg-brand px-4 py-2 text-[14px] text-surface">
        Back to clients
      </Link>
    </main>
  )
}
