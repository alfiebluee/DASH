import Link from "next/link"

import { StageProgress } from "@/components/stage-progress"
import { loadProjects } from "@/lib/data"
import { formatDue, stageLabel } from "@/lib/labels"
import { getSession } from "@/lib/session"

export default async function PortalHome() {
  const session = await getSession()
  const projects = (await loadProjects()).filter((project) => project.status !== "archived")

  return (
    <main className="mt-8">
      <h1 className="text-[36px] font-light tracking-[-0.03em]">Hello, {session?.name}</h1>
      <p className="mt-2 text-[15px] text-ink-2">Your projects.</p>
      {projects.length === 0 ? <p className="mt-8 text-[15px] text-ink-2">Nothing has been shared with you yet.</p> : null}
      <ul className="mt-6 grid gap-4">
        {projects.map((project) => (
          <li key={project.id}>
            <Link href={`/portal/projects/${project.id}`} className="block rounded-[28px] bg-surface p-5 shadow-[var(--shadow)]">
              <span className="text-[22px]">{project.name}</span>
              <span className="mt-1 block text-[13px] text-ink-3">
                {stageLabel(project.stage)} · {formatDue(project.due_date, project.status)}
              </span>
              <div className="mt-4">
                <StageProgress stage={project.stage} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
