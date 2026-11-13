import Link from "next/link"
import { notFound } from "next/navigation"

import { ClientEditor } from "@/components/client-editor"
import { InviteForm } from "@/components/invite-form"
import { loadClient, loadProjects } from "@/lib/data"
import { stageLabel } from "@/lib/labels"

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [client, projects] = await Promise.all([loadClient(id), loadProjects()])
  if (!client) notFound()
  const own = projects.filter((project) => project.client_id === client.id)

  return (
    <main>
      <p className="text-[12px] uppercase tracking-[0.16em] text-ink-3">Client</p>
      <h1 className="mt-2 text-[36px] font-light tracking-[-0.03em]">{client.name}</h1>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-[28px] bg-surface p-6 shadow-[var(--shadow)]">
          <h2 className="text-[18px] font-medium">Details</h2>
          <div className="mt-4">
            <ClientEditor client={client} />
          </div>
        </section>
        <section className="rounded-[28px] bg-surface p-6 shadow-[var(--shadow)]">
          <h2 className="text-[18px] font-medium">Portal invite</h2>
          <p className="mt-2 text-[14px] leading-6 text-ink-2">
            Supabase emails a magic link. The person can then see only this client&apos;s projects.
          </p>
          <div className="mt-4">
            <InviteForm clientId={client.id} email={client.email} />
          </div>
        </section>
      </div>
      <section className="mt-6">
        <h2 className="text-[18px] font-medium">Projects</h2>
        {own.length === 0 ? <p className="mt-3 text-[15px] text-ink-2">No projects for this client yet.</p> : null}
        <ul className="mt-3 grid gap-3">
          {own.map((project) => (
            <li key={project.id}>
              <Link href={`/studio/projects/${project.id}`} className="block rounded-[24px] bg-surface p-4 shadow-[var(--shadow)]">
                {project.name}
                <span className="mt-1 block text-[13px] text-ink-3">{stageLabel(project.stage)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
