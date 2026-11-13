"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { approveDocument, requestChanges, signOff } from "@/app/(portal)/portal/actions"
import { useToast } from "@/components/toast-provider"
import { Button } from "@/components/ui/button"
import { kindLabel, statusClass } from "@/lib/labels"
import type { DocumentRecord } from "@/lib/records"

export function ApprovalPanel({ document, review }: { document: DocumentRecord; review: boolean }) {
  const toast = useToast()
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const locked = document.status === "approved"

  async function run(result: Promise<{ ok: boolean; message: string }>) {
    setPending(true)
    const outcome = await result
    setPending(false)
    toast(outcome.message)
    if (outcome.ok) router.refresh()
  }

  return (
    <article className="rounded-[24px] bg-surface p-4 shadow-[var(--shadow)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[18px] font-normal">{document.title}</h3>
          <p className="text-[13px] text-ink-3">
            {kindLabel(document.kind)} · v{document.version}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[12px] ${statusClass(document.status)}`}>{document.status.replaceAll("_", " ")}</span>
      </div>
      {document.file_path ? (
        <a className="mt-3 inline-block text-[14px] text-brand" href={`/files/${document.id}`}>
          Preview
        </a>
      ) : null}
      {locked ? <p className="mt-3 text-[14px] text-ink-2">Approved.</p> : null}
      {!locked && document.kind === "sign_off" && review ? (
        <form
          className="mt-4 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            void run(signOff(document.id, new FormData(event.currentTarget)))
          }}
        >
          <label className="grid gap-1 text-[13px] text-ink-2">
            Comment, optional
            <textarea name="comment" rows={3} />
          </label>
          <Button type="submit" disabled={pending} className="w-full sm:w-fit">
            Sign off
          </Button>
        </form>
      ) : null}
      {!locked && document.kind !== "sign_off" ? (
        <div className="mt-4 grid gap-3">
          <Button type="button" disabled={pending} className="w-full sm:w-fit" onClick={() => void run(approveDocument(document.id))}>
            Approve
          </Button>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              const comment = String(new FormData(event.currentTarget).get("comment") ?? "").trim()
              if (!comment) {
                toast("Add a comment so the studio knows what to change.")
                return
              }
              void run(requestChanges(document.id, new FormData(event.currentTarget)))
            }}
          >
            <label className="grid gap-1 text-[13px] text-ink-2">
              What should change?
              <textarea name="comment" required rows={3} />
            </label>
            <Button type="submit" tone="quiet" disabled={pending} className="w-full sm:w-fit">
              Request changes
            </Button>
          </form>
        </div>
      ) : null}
    </article>
  )
}
