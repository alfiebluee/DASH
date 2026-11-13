import { notFound } from "next/navigation"

import { ApprovalPanel } from "@/components/approval-panel"
import { StageProgress } from "@/components/stage-progress"
import { loadActivity, loadDocuments, loadProject } from "@/lib/data"
import { formatDue, stageLabel } from "@/lib/labels"

export default async function PortalProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const project = await loadProject(id)
  if (!project) notFound()
  const [documents, activity] = await Promise.all([loadDocuments(id), loadActivity(id)])
  const visibleDocuments = documents.filter((document) => document.status !== "draft")

  return (
    <main className="mt-8">
      <p className="text-[12px] uppercase tracking-[0.16em] text-ink-3">{stageLabel(project.stage)}</p>
      <h1 className="mt-2 text-[36px] font-light tracking-[-0.03em]">{project.name}</h1>
      <p className="mt-2 text-[14px] text-ink-2">{formatDue(project.due_date, project.status)}</p>
      <div className="mt-6">
        <StageProgress stage={project.stage} />
      </div>
      <section className="mt-8 grid gap-4">
        <h2 className="text-[18px] font-medium">Documents</h2>
        {visibleDocuments.length === 0 ? <p className="text-[15px] text-ink-2">No documents have been sent yet.</p> : null}
        {visibleDocuments.map((document) => (
          <ApprovalPanel key={document.id} document={document} review={project.stage === "review"} />
        ))}
      </section>
      <section className="mt-8">
        <h2 className="text-[18px] font-medium">Timeline</h2>
        {activity.length === 0 ? <p className="mt-3 text-[15px] text-ink-2">No updates yet.</p> : null}
        <ul className="mt-3 grid gap-3">
          {activity.map((entry) => (
            <li key={entry.id} className="rounded-[24px] bg-surface p-4">
              <p>{entry.message}</p>
              {entry.comment ? <p className="mt-2 text-[14px] text-ink-2">{entry.comment}</p> : null}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
