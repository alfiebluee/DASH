import Link from "next/link"

import { CreateProjectForm } from "@/components/create-project-form"
import { EmptyState } from "@/components/empty-state"
import { loadClients, loadProjects } from "@/lib/data"
import { formatDue, stageLabel, stages, statusLabel, statuses } from "@/lib/labels"
import { daysInStageLabel } from "@/lib/stages"
import type { ProjectCard } from "@/lib/records"
import { getSession } from "@/lib/session"

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
  const [projects, clients, session] = await Promise.all([loadProjects(), loadClients(), getSession()])
  const canEdit = session?.role === "owner"
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
      {visible.length > 0 ? (
        <div className="mt-6 overflow-x-auto rounded-[24px] bg-surface shadow-[var(--shadow)]">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="text-[12px] uppercase tracking-[0.12em] text-ink-3">
                <th className="px-4 py-3 font-normal">Project</th>
                <th className="px-4 py-3 font-normal">Client</th>
                <th className="px-4 py-3 font-normal">Stage</th>
                <th className="px-4 py-3 font-normal">In stage</th>
                <th className="px-4 py-3 font-normal">Due</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((project) => (
                <tr key={project.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <Link href={`/studio/projects/${project.id}`} className="text-[16px] text-ink">
                      {project.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[14px] text-ink-2">{project.client_name}</td>
                  <td className="px-4 py-3 text-[14px]">{stageLabel(project.stage)}</td>
                  <td className="px-4 py-3 text-[14px] text-ink-2">{daysInStageLabel(project.stage_entered_at)}</td>
                  <td className="px-4 py-3 text-[14px] text-ink-2">{formatDue(project.due_date, project.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {canEdit ? (
        <section className="mt-8 max-w-xl rounded-[28px] bg-surface p-6 shadow-[var(--shadow)]">
          <h2 className="text-[22px] font-normal">New project</h2>
          <div className="mt-4">
            <CreateProjectForm clients={clients} />
          </div>
        </section>
      ) : null}
    </main>
  )
}
