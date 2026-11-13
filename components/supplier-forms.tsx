"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { addSupplier, saveSupplier } from "@/app/(studio)/studio/suppliers/actions"
import { useCanEdit } from "@/components/studio-access"
import { useToast } from "@/components/toast-provider"
import { Button } from "@/components/ui/button"
import type { SupplierRecord } from "@/lib/records"

export function CreateSupplierForm() {
  const toast = useToast()
  const router = useRouter()
  const canEdit = useCanEdit()
  const [pending, setPending] = useState(false)
  if (!canEdit) return null

  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_1fr_8rem_auto] sm:items-end"
      onSubmit={async (event) => {
        event.preventDefault()
        setPending(true)
        const result = await addSupplier(new FormData(event.currentTarget))
        setPending(false)
        toast(result.message)
        if (result.ok) {
          event.currentTarget.reset()
          router.refresh()
        }
      }}
    >
      <label className="grid gap-1 text-[13px] text-ink-2">
        Name
        <input name="name" required />
      </label>
      <label className="grid gap-1 text-[13px] text-ink-2">
        Website
        <input name="website" placeholder="https://" />
      </label>
      <label className="grid gap-1 text-[13px] text-ink-2">
        Lead days
        <input name="default_lead_days" type="number" min={0} defaultValue={0} required />
      </label>
      <Button type="submit" disabled={pending}>
        Add supplier
      </Button>
    </form>
  )
}

export function SupplierEditor({ supplier }: { supplier: SupplierRecord }) {
  const toast = useToast()
  const router = useRouter()
  const canEdit = useCanEdit()
  const [pending, setPending] = useState(false)

  if (!canEdit) {
    return (
      <div>
        <p className="text-[16px]">{supplier.name}</p>
        <p className="mt-1 text-[13px] text-ink-3">{supplier.website || "No website"} · {supplier.default_lead_days} lead days</p>
      </div>
    )
  }

  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_1fr_8rem_auto] sm:items-end"
      onSubmit={async (event) => {
        event.preventDefault()
        setPending(true)
        const result = await saveSupplier(supplier.id, new FormData(event.currentTarget))
        setPending(false)
        toast(result.message)
        if (result.ok) router.refresh()
      }}
    >
      <label className="grid gap-1 text-[13px] text-ink-2">
        Name
        <input name="name" defaultValue={supplier.name} required />
      </label>
      <label className="grid gap-1 text-[13px] text-ink-2">
        Website
        <input name="website" defaultValue={supplier.website} />
      </label>
      <label className="grid gap-1 text-[13px] text-ink-2">
        Lead days
        <input name="default_lead_days" type="number" min={0} defaultValue={supplier.default_lead_days} required />
      </label>
      <Button type="submit" tone="surface" disabled={pending}>
        Save
      </Button>
    </form>
  )
}
