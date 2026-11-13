"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { deleteDocument, sendDocument, uploadDocument } from "@/app/(studio)/studio/projects/actions"
import { useCanEdit } from "@/components/studio-access"
import { useToast } from "@/components/toast-provider"
import { Button } from "@/components/ui/button"
import { kindLabel, statusClass, uploadKinds } from "@/lib/labels"
import type { DocumentRecord } from "@/lib/records"

export function DocumentPanel({ projectId, documents }: { projectId: string; documents: DocumentRecord[] }) {
  const toast = useToast()
  const router = useRouter()
  const canEdit = useCanEdit()
  const [pending, setPending] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [defaults, setDefaults] = useState<{ kind: string; title: string }>({ kind: "proposal", title: "" })

  return (
    <div className="grid gap-6">
      {canEdit ? <form
        className="grid gap-3 rounded-[28px] bg-surface p-6 shadow-[var(--shadow)]"
        onSubmit={async (event) => {
          event.preventDefault()
          setPending(true)
          const result = await uploadDocument(projectId, new FormData(event.currentTarget))
          setPending(false)
          toast(result.message)
          if (result.ok) {
            event.currentTarget.reset()
            router.refresh()
          }
        }}
      >
        <label className="grid gap-1 text-[13px] text-ink-2">
          Kind
          <select
            name="kind"
            value={defaults.kind}
            onChange={(event) => setDefaults((current) => ({ ...current, kind: event.target.value }))}
          >
            {uploadKinds.map((kind) => (
              <option key={kind} value={kind}>
                {kindLabel(kind)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-[13px] text-ink-2">
          Title
          <input
            name="title"
            required
            value={defaults.title}
            onChange={(event) => setDefaults((current) => ({ ...current, title: event.target.value }))}
          />
        </label>
        <label className="grid gap-1 text-[13px] text-ink-2">
          File
          <input name="file" type="file" accept="application/pdf,image/png,image/jpeg,image/webp,image/gif" required />
        </label>
        <Button type="submit" disabled={pending}>
          Upload
        </Button>
      </form> : null}
      {documents.length === 0 ? <p className="text-[15px] text-ink-2">{canEdit ? "No documents yet. Upload a proposal, scope, or set design." : "No documents yet."}</p> : null}
      <ul className="grid gap-3">
        {documents.map((document) => (
          <li key={document.id} className="rounded-[24px] bg-surface p-4 shadow-[var(--shadow)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[15px]">
                  {document.title} <span className="text-ink-3">v{document.version}</span>
                </p>
                <p className="text-[13px] text-ink-3">{kindLabel(document.kind)}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-[12px] capitalize ${statusClass(document.status)}`}>{document.status.replaceAll("_", " ")}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-[13px]">
              {document.file_path ? (
                <a className="text-brand" href={`/files/${document.id}`} target="_blank" rel="noreferrer">
                  Preview
                </a>
              ) : null}
              {canEdit && document.status !== "approved" && document.status !== "sent" ? (
                <button
                  type="button"
                  className="text-ink"
                  onClick={async () => {
                    const result = await sendDocument(document.id)
                    toast(result.message)
                    if (result.ok) router.refresh()
                  }}
                >
                  Send to client
                </button>
              ) : null}
              {canEdit && uploadKinds.includes(document.kind as (typeof uploadKinds)[number]) ? (
                <button
                  type="button"
                  className="text-ink-2"
                  onClick={() => setDefaults({ kind: document.kind, title: document.title })}
                >
                  New version
                </button>
              ) : null}
              {canEdit ? <button
                type="button"
                className="text-ink-2"
                aria-label={`Delete ${document.title} v${document.version}`}
                disabled={deletingId === document.id}
                onClick={async () => {
                  if (!window.confirm(`Delete ${document.title} v${document.version}?`)) return
                  setDeletingId(document.id)
                  const result = await deleteDocument(document.id)
                  setDeletingId(null)
                  toast(result.message)
                  if (result.ok) router.refresh()
                }}
              >
                Delete
              </button> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
