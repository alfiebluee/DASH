"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { saveSettings } from "@/app/(studio)/studio/settings/actions"
import { useToast } from "@/components/toast-provider"
import { Button } from "@/components/ui/button"
import type { SettingsRecord } from "@/lib/records"

export function SettingsForm({ settings }: { settings: SettingsRecord }) {
  const toast = useToast()
  const router = useRouter()
  const [pending, setPending] = useState(false)

  return (
    <form
      className="grid max-w-lg gap-4 rounded-[28px] bg-surface p-8 shadow-[var(--shadow)]"
      onSubmit={async (event) => {
        event.preventDefault()
        setPending(true)
        const result = await saveSettings(new FormData(event.currentTarget))
        setPending(false)
        toast(result.message)
        if (result.ok) router.refresh()
      }}
    >
      <label className="grid gap-1 text-[13px] text-ink-2">
        Business name
        <input name="business_name" required defaultValue={settings.business_name} />
      </label>
      <label className="grid gap-1 text-[13px] text-ink-2">
        Business email
        <input name="business_email" type="email" required defaultValue={settings.business_email} />
      </label>
      <label className="grid gap-1 text-[13px] text-ink-2">
        Deposit percent
        <input name="deposit_percent" type="number" min={0} max={100} step="0.01" required defaultValue={settings.deposit_percent} />
      </label>
      <label className="grid gap-1 text-[13px] text-ink-2" id="away">
        Away from
        <input name="away_from" type="date" defaultValue={settings.away_from ?? ""} />
      </label>
      <label className="grid gap-1 text-[13px] text-ink-2">
        Away until
        <input name="away_until" type="date" defaultValue={settings.away_until ?? ""} />
      </label>
      <Button type="submit" disabled={pending}>
        Save settings
      </Button>
    </form>
  )
}
