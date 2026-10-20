import * as Dialog from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { useState } from "react"
import { EVENT_KINDS, eventCreateSchema, type EventCreate, type StudioEvent } from "../../data/schemas.ts"
import { dayIso } from "../../lib/dates.ts"
import { useCommands } from "../../lib/commands.ts"
import { undoToast } from "../../lib/mutations.ts"
import { useStudio } from "../../lib/studio.tsx"

const inputClass = "mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink"

export function EventEditor() {
  const { eventRequest, closeEvent } = useCommands().ui
  return (
    <Dialog.Root open={eventRequest !== null} onOpenChange={(open) => { if (!open) closeEvent() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-[#0F1C24]/20" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[70] w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-[28px] bg-white p-5 shadow-lift outline-none">
          {eventRequest?.mode === "create" ? <CreateEvent draft={eventRequest.draft} /> : null}
          {eventRequest?.mode === "edit" ? <EditEvent id={eventRequest.id} /> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function CreateEvent({ draft }: { draft: Partial<EventCreate> }) {
  const commands = useCommands()
  const [form, setForm] = useState<EventCreate>({
    title: draft.title ?? "",
    date: draft.date ?? dayIso(new Date()),
    endDate: draft.endDate,
    kind: draft.kind ?? "Meeting",
    projectId: draft.projectId,
    source: "manual",
    done: false,
  })
  const parsed = eventCreateSchema.safeParse(form)
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (!parsed.success) return
        void commands.mutations.createEvent.mutateAsync(parsed.data).then(() => commands.ui.closeEvent())
      }}
    >
      <Heading title="New date" />
      <EventFields form={form} setForm={setForm} projects={commands.projects} />
      <button type="submit" disabled={!parsed.success} className="w-full rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-40">
        Create
      </button>
    </form>
  )
}

function EditEvent({ id }: { id: string }) {
  const event = useStudio().data?.events.find((item) => item.id === id)
  if (!event) {
    return (
      <>
        <Heading title="Date" />
        <p className="text-sm text-ink-2">That date is no longer here.</p>
      </>
    )
  }
  return <EditEventForm key={event.id} event={event} />
}

function EditEventForm({ event }: { event: StudioEvent }) {
  const commands = useCommands()
  const [form, setForm] = useState<EventCreate>({
    title: event.title,
    date: event.date,
    endDate: event.endDate,
    kind: event.kind,
    projectId: event.projectId,
    source: event.source,
    done: event.done,
  })

  function save(next: EventCreate) {
    setForm(next)
    const parsed = eventCreateSchema.safeParse(next)
    if (parsed.success) void commands.mutations.updateEvent.mutateAsync({ id: event.id, patch: parsed.data })
  }

  return (
    <div className="space-y-3">
      <Heading title={event.title} />
      <EventFields form={form} setForm={save} projects={commands.projects} />
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="rounded-full px-3 py-1.5 text-[13px] text-ink-2 hover:bg-surface-muted"
          onClick={() => {
            const next = !event.done
            void commands.mutations.updateEvent.mutateAsync({ id: event.id, patch: { done: next } }).then(() => {
              undoToast(next ? "Marked done" : "Marked not done", () =>
                commands.mutations.updateEvent.mutateAsync({ id: event.id, patch: { done: event.done } }),
              )
            })
          }}
        >
          {event.done ? "Mark not done" : "Mark done"}
        </button>
        <button
          type="button"
          className="rounded-full px-3 py-1.5 text-[13px] text-[#B3261E]"
          onClick={() => {
            const { id, ...rest } = event
            void commands.mutations.deleteEvent.mutateAsync(id).then(() => {
              commands.ui.closeEvent()
              undoToast("Deleted date", () => commands.mutations.createEvent.mutateAsync(rest))
            })
          }}
        >
          Delete
        </button>
      </div>
    </div>
  )
}

function EventFields({
  form,
  setForm,
  projects,
}: {
  form: EventCreate
  setForm: (next: EventCreate) => void
  projects: { id: string; name: string; archived: boolean }[]
}) {
  return (
    <>
      <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
        Title
        <input className={inputClass} value={form.title} maxLength={120} onChange={(event) => setForm({ ...form, title: event.target.value })} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
          Date
          <input className={inputClass} type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
        </label>
        <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
          Kind
          <select className={inputClass} value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as EventCreate["kind"] })}>
            {EVENT_KINDS.map((kind) => (
              <option key={kind}>{kind}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
        Project
        <select className={inputClass} value={form.projectId ?? ""} onChange={(event) => setForm({ ...form, projectId: event.target.value || undefined })}>
          <option value="">None</option>
          {projects.filter((project) => !project.archived).map((project) => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>
      </label>
    </>
  )
}

function Heading({ title }: { title: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <Dialog.Title className="text-[18px] font-medium tracking-tight">{title}</Dialog.Title>
      <Dialog.Description className="sr-only">Edit the date, then it stays on the timeline.</Dialog.Description>
      <Dialog.Close className="grid h-8 w-8 place-items-center rounded-full text-ink-2 hover:bg-surface-muted" aria-label="Close">
        <X strokeWidth={1.5} className="h-4 w-4" />
      </Dialog.Close>
    </div>
  )
}
