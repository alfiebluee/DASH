"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { inviteClient } from "@/app/(studio)/studio/clients/actions"
import { useToast } from "@/components/toast-provider"
import { Button } from "@/components/ui/button"

export function InviteForm({ clientId, email }: { clientId: string; email: string | null }) {
  const toast = useToast()
  const router = useRouter()
  const [pending, setPending] = useState(false)

  return (
    <form
      className="grid gap-3"
      onSubmit={async (event) => {
        event.preventDefault()
        setPending(true)
        const result = await inviteClient(clientId, new FormData(event.currentTarget))
        setPending(false)
        toast(result.message)
        if (result.ok) router.refresh()
      }}
    >
      <label className="grid gap-1 text-[13px] text-ink-2">
        Invite email
        <input name="email" type="email" required defaultValue={email ?? ""} />
      </label>
      <Button type="submit" disabled={pending}>
        Send invite
      </Button>
    </form>
  )
}
