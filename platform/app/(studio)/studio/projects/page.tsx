import Link from "next/link"

import { CreateProjectForm } from "@/components/create-project-form"
import { EmptyState } from "@/components/empty-state"
import { loadClients, loadProjects } from "@/lib/data"
import { formatDue, stageLabel, stages, statusLabel, statuses } from "@/lib/labels"
import type { ProjectCard } from "@/lib/records"

function matches(project: ProjectCard, query: { stage?: string; status?: string; q?: string }) {
  if (query.stage && project.stage !== query.stage) return false
  if (query.status) {
    if (project.status !== query.status) return false
  } else if (project.status === "archived") {
    return false
  }
  const needle = query.q?.trim().toLowerCase()
  if (!needle) return true
  return `${project.name} ${project.client_name} ${project.type}`.toLowerCase().includes(needle)
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; status?: string; q?: string }>
}) {
  const query = await searchParams
  const [projects, clients] = await Promise.all([loadProjects(), loadClients()])
  const visible = projects.filter((project) => matches(project, query))
  const search = query.q ?? ""

  function href(next: { stage?: string; status?: string }) {
    const params = new URLSearchParams()
    if (next.stage) params.set("stage", next.stage)
    if (next.status) params.set("status", next.status)
    if (search) params.set("q", search)
    const value = params.toString()
    return value ? `/studio/projects?${value}` : "/studio/projects"
  }

  return (
    <main>
      <p className="text-[12px] uppercase tracking-[0.16em] text-ink-3">Projects</p>
      <h1 className="mt-2 text-[32px] font-light tracking-[-0.03em]">All projects</h1>
      <form className="mt-6 flex flex-wrap gap-2" action="/studio/projects" method="get">
        {query.stage ? <input type="hidden" name="stage" value={query.stage} /> : null}
        {query.status ? <input type="hidden" name="status" value={query.status} /> : null}
        <label className="text-[13px] text-ink-2">
          Search
          <input name="q" defaultValue={search} aria-label="Search projects" className="ml-2" />
        </label>
        <button type="submit" className="rounded-full bg-brand px-4 py-2 text-[14px] text-surface">
          Search
        </button>
      </form>
      <div className="mt-4 flex flex-wrap gap-2 text-[13px]">
        <Link href={href({ status: query.status })} className={!query.stage ? "text-ink" : "text-ink-3"}>
          All stages
        </Link>
        {stages.map((stage) => (
          <Link key={stage} href={href({ stage, status: query.status })} className={query.stage === stage ? "text-ink" : "text-ink-3"}>
            {stageLabel(stage)}
          </Link>
        ))}
        <Link href={href({ stage: query.stage })} className={!query.status ? "text-ink" : "text-ink-3"}>
          Open
        </Link>
        {statuses.map((status) => (
          <Link key={status} href={href({ stage: query.stage, status })} className={query.status === status ? "text-ink" : "text-ink-3"}>
            {statusLabel(status)}
          </Link>
        ))}
      </div>
      {projects.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No projects yet" body="Add the first project. It needs a client." action={null} />
        </div>
      ) : null}
      {projects.length > 0 && visible.length === 0 ? (
        <p className="mt-8 text-[15px] text-ink-2">No projects match these filters.</p>
      ) : null}
      <ul className="mt-6 grid gap-3">
        {visible.map((project) => (
          <li key={project.id}>
            <Link href={`/studio/projects/${project.id}`} className="block rounded-[24px] bg-surface p-4 shadow-[var(--shadow)]">
              <span className="text-[18px]">{project.name}</span>
              <span className="mt-1 block text-[13px] text-ink-3">
                {project.client_name} · {stageLabel(project.stage)} · {formatDue(project.due_date, project.status)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <section className="mt-8 max-w-xl rounded-[28px] bg-surface p-6 shadow-[var(--shadow)]">
        <h2 className="text-[22px] font-normal">New project</h2>
        <div className="mt-4">
          <CreateProjectForm clients={clients} />
        </div>
      </section>
    </main>
  )
}
