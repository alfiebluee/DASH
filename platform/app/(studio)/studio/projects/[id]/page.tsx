import Link from "next/link"
import { notFound } from "next/navigation"

import { DocumentPanel } from "@/components/document-panel"
import { MaterialsPanel } from "@/components/materials-panel"
import { ProjectEditor } from "@/components/project-editor"
import { ProjectSwitcher } from "@/components/project-switcher"
import { StageTracker } from "@/components/stage-tracker"
import { loadActivity, loadAreas, loadClients, loadDocuments, loadMaterials, loadProject, loadProjects, loadSuppliers } from "@/lib/data"
import { formatDue, stageLabel } from "@/lib/labels"

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "documents", label: "Documents" },
  { id: "materials", label: "Materials" },
  { id: "activity", label: "Activity" },
] as const

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const query = await searchParams
  const tab = tabs.some((item) => item.id === query.tab) ? query.tab ?? "overview" : "overview"
  const [project, projects, clients, documents, activity, areas, materials, suppliers] = await Promise.all([
    loadProject(id),
    loadProjects(),
    loadClients(),
    loadDocuments(id),
    loadActivity(id),
    loadAreas(id),
    loadMaterials(id),
    loadSuppliers(),
  ])
  if (!project) notFound()

  return (
    <main>
      <ProjectSwitcher projects={projects} currentId={project.id} tab={tab} />
      <p className="mt-6 text-[12px] uppercase tracking-[0.16em] text-ink-3">
        {project.client_name} · {stageLabel(project.stage)}
      </p>
      <h1 className="mt-2 text-[36px] font-light tracking-[-0.03em]">{project.name}</h1>
      <p className="mt-2 text-[14px] text-ink-2">{formatDue(project.due_date, project.status)}</p>
      <nav className="mt-6 flex gap-2" aria-label="Project">
        {tabs.map((item) => (
          <Link
            key={item.id}
            href={item.id === "overview" ? `/studio/projects/${project.id}` : `/studio/projects/${project.id}?tab=${item.id}`}
            aria-current={tab === item.id ? "page" : undefined}
            className={`rounded-full px-3 py-2 text-[14px] ${tab === item.id ? "bg-surface text-ink shadow-[var(--shadow)]" : "text-ink-2"}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {tab === "overview" ? (
        <div className="mt-6 grid gap-6">
          <section className="rounded-[28px] bg-surface p-6 shadow-[var(--shadow)]">
            <h2 className="text-[18px] font-medium">Stage</h2>
            <div className="mt-4">
              <StageTracker projectId={project.id} stage={project.stage} />
            </div>
          </section>
          <section className="max-w-xl rounded-[28px] bg-surface p-6 shadow-[var(--shadow)]">
            <h2 className="text-[18px] font-medium">Details</h2>
            <div className="mt-4">
              <ProjectEditor project={project} clients={clients} />
            </div>
          </section>
        </div>
      ) : null}
      {tab === "materials" ? (
        <div className="mt-6">
          <MaterialsPanel projectId={project.id} areas={areas} materials={materials} suppliers={suppliers} />
        </div>
      ) : null}
      {tab === "documents" ? (
        <div className="mt-6">
          <DocumentPanel projectId={project.id} documents={documents} />
        </div>
      ) : null}
      {tab === "activity" ? (
        <ul className="mt-6 grid gap-3">
          {activity.length === 0 ? <li className="text-[15px] text-ink-2">Nothing has been recorded yet.</li> : null}
          {activity.map((entry) => (
            <li key={entry.id} className="rounded-[24px] bg-surface p-4 shadow-[var(--shadow)]">
              <p>{entry.message}</p>
              {entry.comment ? <p className="mt-2 text-[14px] text-ink-2">{entry.comment}</p> : null}
              <p className="mt-2 text-[12px] text-ink-3">{new Date(entry.created_at).toLocaleString("en-GB")}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  )
}
