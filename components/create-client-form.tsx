"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { addClient } from "@/app/(studio)/studio/clients/actions"
import { useToast } from "@/components/toast-provider"
import { Button } from "@/components/ui/button"

export function CreateClientForm({ onDone }: { onDone?: () => void }) {
  const toast = useToast()
  const router = useRouter()
  const [pending, setPending] = useState(false)

  return (
    <form
      className="grid gap-3"
      onSubmit={async (event) => {
        event.preventDefault()
        setPending(true)
        const result = await addClient(new FormData(event.currentTarget))
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
        Name
        <input name="name" required />
      </label>
      <label className="grid gap-1 text-[13px] text-ink-2">
        Company
        <input name="company" />
      </label>
      <label className="grid gap-1 text-[13px] text-ink-2">
        Email
        <input name="email" type="email" />
      </label>
      <label className="grid gap-1 text-[13px] text-ink-2">
        Phone
        <input name="phone" />
      </label>
      <Button type="submit" disabled={pending}>
        Create client
      </Button>
    </form>
  )
}
