"use client"

import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import { CreateClientForm } from "@/components/create-client-form"
import { CreateProjectForm } from "@/components/create-project-form"
import { useCanEdit } from "@/components/studio-access"
import { Modal } from "@/components/ui/dialog"
import type { ClientRecord, ProjectCard } from "@/lib/records"

export function CommandPalette({ projects, clients }: { projects: ProjectCard[]; clients: ClientRecord[] }) {
  const canEdit = useCanEdit()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [mode, setMode] = useState<"search" | "project" | "client">("search")
  const router = useRouter()
  const needle = query.trim().toLowerCase()
  const projectHits = useMemo(
    () => projects.filter((project) => `${project.name} ${project.client_name} ${project.type}`.toLowerCase().includes(needle)).slice(0, 8),
    [needle, projects],
  )
  const clientHits = useMemo(
    () => clients.filter((client) => `${client.name} ${client.company}`.toLowerCase().includes(needle)).slice(0, 8),
    [clients, needle],
  )

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setMode("search")
        setOpen(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <>
      <button
        type="button"
        className="rounded-full bg-surface px-4 py-2 text-[14px] text-ink-2 shadow-[var(--shadow)]"
        onClick={() => {
          setMode("search")
          setOpen(true)
        }}
      >
        {canEdit ? "Add or find anything" : "Find anything"}
      </button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={mode === "project" ? "New project" : mode === "client" ? "New client" : canEdit ? "Add or find anything" : "Find anything"}
        description={canEdit ? "Search projects and clients, or create one." : "Search projects and clients."}
      >
        {mode === "search" ? (
          <div className="grid gap-3">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              aria-label="Search"
            />
            {canEdit ? (
              <div className="flex gap-2">
                <button type="button" className="rounded-full bg-brand px-3 py-2 text-[13px] text-surface" onClick={() => setMode("project")}>
                  New project
                </button>
                <button type="button" className="rounded-full bg-column px-3 py-2 text-[13px]" onClick={() => setMode("client")}>
                  New client
                </button>
              </div>
            ) : null}
            <ul className="grid gap-1">
              {projectHits.map((project) => (
                <li key={project.id}>
                  <button
                    type="button"
                    className="w-full rounded-2xl px-3 py-2 text-left hover:bg-column"
                    onClick={() => {
                      setOpen(false)
                      router.push(`/studio/projects/${project.id}`)
                    }}
                  >
                    {project.name}
                    <span className="ml-2 text-[12px] text-ink-3">{project.client_name}</span>
                  </button>
                </li>
              ))}
              {clientHits.map((client) => (
                <li key={client.id}>
                  <button
                    type="button"
                    className="w-full rounded-2xl px-3 py-2 text-left hover:bg-column"
                    onClick={() => {
                      setOpen(false)
                      router.push(`/studio/clients/${client.id}`)
                    }}
                  >
                    {client.name}
                    <span className="ml-2 text-[12px] text-ink-3">Client</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {mode === "project" ? <CreateProjectForm clients={clients} onDone={() => setOpen(false)} /> : null}
        {mode === "client" ? <CreateClientForm onDone={() => setOpen(false)} /> : null}
      </Modal>
    </>
  )
}
