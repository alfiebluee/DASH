"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { createProject } from "@/app/(studio)/studio/projects/actions"
import { useToast } from "@/components/toast-provider"
import { Button } from "@/components/ui/button"
import { stageLabel, stages, statusLabel, statuses } from "@/lib/labels"
import type { ClientRecord } from "@/lib/records"

export function CreateProjectForm({ clients, onDone }: { clients: ClientRecord[]; onDone?: () => void }) {
  const toast = useToast()
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const openClients = clients.filter((client) => !client.archived_at)

  if (openClients.length === 0) {
    return <p className="text-[14px] text-ink-2">Create a client before adding a project.</p>
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={async (event) => {
        event.preventDefault()
        setPending(true)
        const result = await createProject(new FormData(event.currentTarget))
        setPending(false)
        toast(result.message)
        if (result.ok) {
          event.currentTarget.reset()
          onDone?.()
          router.refresh()
        }
      }}
    >
      <label className="grid gap-1 text-[13px] text-ink-2">
        Client
        <select name="client_id" required defaultValue={openClients[0]?.id}>
          {openClients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-[13px] text-ink-2">
        Project name
        <input name="name" required maxLength={160} />
      </label>
      <label className="grid gap-1 text-[13px] text-ink-2">
        Type
        <input name="type" maxLength={80} placeholder="Set Design & Delivery" />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-[13px] text-ink-2">
          Stage
          <select name="stage" defaultValue="pipeline">
            {stages.map((stage) => (
              <option key={stage} value={stage}>
                {stageLabel(stage)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-[13px] text-ink-2">
          Status
          <select name="status" defaultValue="ongoing">
            {statuses.filter((status) => status !== "archived").map((status) => (
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
          <input name="start_date" type="date" />
        </label>
        <label className="grid gap-1 text-[13px] text-ink-2">
          Due
          <input name="due_date" type="date" />
        </label>
      </div>
      <label className="grid gap-1 text-[13px] text-ink-2">
        Description
        <textarea name="description" rows={3} />
      </label>
      <Button type="submit" disabled={pending}>
        Create project
      </Button>
    </form>
  )
}
