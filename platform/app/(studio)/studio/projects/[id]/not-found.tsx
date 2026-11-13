import Link from "next/link"

export default function ProjectNotFound() {
  return (
    <main>
      <h1 className="text-[32px] font-light">Project not found</h1>
      <p className="mt-2 text-[15px] text-ink-2">That project is not in the studio.</p>
      <Link href="/studio/projects" className="mt-6 inline-flex rounded-full bg-brand px-4 py-2 text-[14px] text-surface">
        Back to projects
      </Link>
    </main>
  )
}
