import Link from "next/link"

export default function PortalProjectNotFound() {
  return (
    <main className="mt-10">
      <h1 className="text-[32px] font-light">Project not found</h1>
      <p className="mt-2 text-[15px] text-ink-2">This project is not on your account.</p>
      <Link href="/portal" className="mt-6 inline-flex w-full justify-center rounded-full bg-brand px-4 py-3 text-[14px] text-surface sm:w-fit">
        Back to your projects
      </Link>
    </main>
  )
}
