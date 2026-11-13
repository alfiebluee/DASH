"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { saveClient, setClientArchived } from "@/app/(studio)/studio/clients/actions"
import { useToast } from "@/components/toast-provider"
import { Button } from "@/components/ui/button"
import type { ClientRecord } from "@/lib/records"

export function ClientEditor({ client }: { client: ClientRecord }) {
  const toast = useToast()
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const archived = Boolean(client.archived_at)

  return (
    <div className="grid gap-6">
      <form
        className="grid gap-3"
        onSubmit={async (event) => {
          event.preventDefault()
          setPending(true)
          const result = await saveClient(client.id, new FormData(event.currentTarget))
          setPending(false)
          toast(result.message)
          if (result.ok) router.refresh()
        }}
      >
        <label className="grid gap-1 text-[13px] text-ink-2">
          Name
          <input name="name" required defaultValue={client.name} />
        </label>
        <label className="grid gap-1 text-[13px] text-ink-2">
          Company
          <input name="company" defaultValue={client.company} />
        </label>
        <label className="grid gap-1 text-[13px] text-ink-2">
          Email
          <input name="email" type="email" defaultValue={client.email ?? ""} />
        </label>
        <label className="grid gap-1 text-[13px] text-ink-2">
          Phone
          <input name="phone" defaultValue={client.phone} />
        </label>
        <Button type="submit" disabled={pending}>
          Save client
        </Button>
      </form>
      <Button
        type="button"
        tone="quiet"
        disabled={pending}
        onClick={async () => {
          const message = archived ? `Restore ${client.name}?` : `Archive ${client.name}? Their projects stay.`
          if (!window.confirm(message)) return
          setPending(true)
          const result = await setClientArchived(client.id, !archived)
          setPending(false)
          toast(result.message)
          if (result.ok) router.refresh()
        }}
      >
        {archived ? "Restore client" : "Archive client"}
      </Button>
    </div>
  )
}
