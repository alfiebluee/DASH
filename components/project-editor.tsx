"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { saveProject } from "@/app/(studio)/studio/projects/actions"
import { useCanEdit } from "@/components/studio-access"
import { useToast } from "@/components/toast-provider"
import { Button } from "@/components/ui/button"
import { statusLabel, statuses } from "@/lib/labels"
import type { ClientRecord, ProjectCard } from "@/lib/records"

export function ProjectEditor({ project, clients }: { project: ProjectCard; clients: ClientRecord[] }) {
  const toast = useToast()
  const router = useRouter()
  const canEdit = useCanEdit()
  const [pending, setPending] = useState(false)
  const clientName = clients.find((client) => client.id === project.client_id)?.name ?? ""

  if (!canEdit) {
    return (
      <dl className="grid gap-3 text-[15px]">
        <div><dt className="text-[13px] text-ink-3">Client</dt><dd>{clientName}</dd></div>
        <div><dt className="text-[13px] text-ink-3">Type</dt><dd>{project.type}</dd></div>
        <div><dt className="text-[13px] text-ink-3">Status</dt><dd>{statusLabel(project.status)}</dd></div>
        <div><dt className="text-[13px] text-ink-3">Start</dt><dd>{project.start_date ?? "Not set"}</dd></div>
        <div><dt className="text-[13px] text-ink-3">Due</dt><dd>{project.due_date ?? "Not set"}</dd></div>
        {project.description ? <div><dt className="text-[13px] text-ink-3">Description</dt><dd>{project.description}</dd></div> : null}
      </dl>
    )
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={async (event) => {
        event.preventDefault()
        setPending(true)
        const result = await saveProject(project.id, new FormData(event.currentTarget))
        setPending(false)
        toast(result.message)
        if (result.ok) router.refresh()
      }}
    >
      <label className="grid gap-1 text-[13px] text-ink-2">
        Client
        <select name="client_id" defaultValue={project.client_id} required>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-[13px] text-ink-2">
        Name
        <input name="name" required defaultValue={project.name} />
      </label>
      <label className="grid gap-1 text-[13px] text-ink-2">
        Type
        <input name="type" defaultValue={project.type} />
      </label>
      <input type="hidden" name="stage" value={project.stage} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-[13px] text-ink-2">
          Status
          <select name="status" defaultValue={project.status}>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-[13px] text-ink-2">
          Start
          <input name="start_date" type="date" defaultValue={project.start_date ?? ""} />
        </label>
        <label className="grid gap-1 text-[13px] text-ink-2">
          Due
          <input name="due_date" type="date" defaultValue={project.due_date ?? ""} />
        </label>
      </div>
      <label className="grid gap-1 text-[13px] text-ink-2">
        Description
        <textarea name="description" rows={4} defaultValue={project.description} />
      </label>
      <Button type="submit" disabled={pending}>
        Save project
      </Button>
    </form>
  )
}
