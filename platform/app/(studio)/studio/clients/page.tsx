import Link from "next/link"

import { CreateClientForm } from "@/components/create-client-form"
import { loadClients, loadProjects } from "@/lib/data"

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ archived?: string }> }) {
  const query = await searchParams
  const showArchived = query.archived === "1"
  const [clients, projects] = await Promise.all([loadClients(), loadProjects()])
  const visible = clients.filter((client) => (showArchived ? Boolean(client.archived_at) : !client.archived_at))

  return (
    <main>
      <p className="text-[12px] uppercase tracking-[0.16em] text-ink-3">Clients</p>
      <h1 className="mt-2 text-[32px] font-light tracking-[-0.03em]">Clients</h1>
      <p className="mt-3 text-[14px]">
        {showArchived ? (
          <Link href="/studio/clients" className="text-brand">
            Show current clients
          </Link>
        ) : (
          <Link href="/studio/clients?archived=1" className="text-brand">
            Show archived
          </Link>
        )}
      </p>
      {visible.length === 0 ? <p className="mt-8 text-[15px] text-ink-2">No clients in this list.</p> : null}
      <ul className="mt-6 grid gap-3">
        {visible.map((client) => {
          const count = projects.filter((project) => project.client_id === client.id).length
          return (
            <li key={client.id}>
              <Link href={`/studio/clients/${client.id}`} className="block rounded-[24px] bg-surface p-4 shadow-[var(--shadow)]">
                <span className="text-[18px]">{client.name}</span>
                <span className="mt-1 block text-[13px] text-ink-3">
                  {count} {count === 1 ? "project" : "projects"}
                  {client.email ? ` · ${client.email}` : ""}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
      <section className="mt-8 max-w-xl rounded-[28px] bg-surface p-6 shadow-[var(--shadow)]">
        <h2 className="text-[22px] font-normal">New client</h2>
        <div className="mt-4">
          <CreateClientForm />
        </div>
      </section>
    </main>
  )
}
