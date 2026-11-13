import * as Dialog from "@radix-ui/react-dialog"
import { Check, X } from "lucide-react"
import { useState, type ReactNode } from "react"
import { z } from "zod"
import {
  COLOURS,
  PROJECT_TYPES,
  STAGES,
  STATUSES,
  projectCreateSchema,
  type EventCreate,
  type Link,
  type Project,
  type ProjectCreate,
  type Stage,
  type StudioEvent,
} from "../../data/schemas.ts"
import { dayIso } from "../../lib/dates.ts"
import { parse } from "chrono-node"
import { format } from "date-fns"
import { useCommands } from "../../lib/commands.ts"
import { undoToast } from "../../lib/mutations.ts"
import { useStudio } from "../../lib/studio.tsx"
import { swatch } from "../../styles/tokens.ts"
import { cn } from "../../lib/cn.ts"

const inputClass = "mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink"

export function ProjectSheet() {
  const { projectRequest, closeProject } = useCommands().ui
  const open = projectRequest !== null
  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!next) closeProject() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[#0F1C24]/20 backdrop-blur-md" />
        <Dialog.Content className="fixed inset-0 z-50 flex flex-col bg-white shadow-lift outline-none motion-reduce:animate-none sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[420px] sm:animate-[sheet-in_280ms_ease]">
          {projectRequest && "id" in projectRequest ? <EditSheet id={projectRequest.id} /> : null}
          {projectRequest && "stage" in projectRequest ? <CreateSheet stage={projectRequest.stage} /> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function EditSheet({ id }: { id: string }) {
  const studio = useStudio()
  const project = studio.data?.projects.find((item) => item.id === id)
  const events = studio.data?.events.filter((event) => event.projectId === id) ?? []
  if (!project) {
    return (
      <SheetFrame title="Project">
        <p className="text-sm text-ink-2">That project is no longer here.</p>
      </SheetFrame>
    )
  }
  return (
    <SheetFrame title={project.name} description="Edits save as you leave each field.">
      <EditForm key={project.updatedAt} project={project} events={events} />
    </SheetFrame>
  )
}

function EditForm({ project, events }: { project: Project; events: StudioEvent[] }) {
  const commands = useCommands()
  const [saved, setSaved] = useState(false)
  const [confirming, setConfirming] = useState(false)

  async function save(patch: Partial<ProjectCreate>) {
    await commands.saveProject(project.id, patch)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1200)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <Saved saved={saved} />
        <BlurText label="Name" value={project.name} onSave={(name) => save({ name })} />
        <BlurText label="Client" value={project.client} onSave={(client) => save({ client })} />
        <BlurText label="Description" value={project.description} maxLength={80} onSave={(description) => save({ description })} />
        <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
          Type
          <select className={inputClass} value={project.type} onChange={(event) => void save({ type: event.target.value as Project["type"] })}>
            {PROJECT_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">Stage</legend>
          <div className="mt-2 flex flex-wrap gap-1">
            {STAGES.map((stage, index) => (
              <button
                key={stage}
                type="button"
                aria-pressed={project.stage === stage}
                className={cn("rounded-full px-2.5 py-1 text-[12px]", project.stage === stage ? "bg-ink text-white" : "bg-surface-muted text-ink-2")}
                onClick={() => void commands.setStage(project.id, stage)}
              >
                {commands.settings?.stageLabels[index] ?? stage}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
            Status
            <select className={inputClass} value={project.status} onChange={(event) => void save({ status: event.target.value as Project["status"] })}>
              {STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
          <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
            Priority
            <select className={inputClass} value={project.priority} onChange={(event) => void save({ priority: Number(event.target.value) as 1 | 2 | 3 })}>
              <option value={1}>1 · High</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </label>
        </div>
        <ColourField value={project.colour} onSave={(colour) => void save({ colour })} />
        <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
          Progress {project.progress}%
          <input
            className="mt-2 w-full"
            type="range"
            min={0}
            max={100}
            defaultValue={project.progress}
            aria-label="Progress"
            onPointerUp={(event) => void save({ progress: Number(event.currentTarget.value) })}
            onKeyUp={(event) => void save({ progress: Number(event.currentTarget.value) })}
            onBlur={(event) => void save({ progress: Number(event.currentTarget.value) })}
          />
        </label>
        <DateField label="Start" value={project.startDate} onSave={(startDate) => void save({ startDate })} />
        <DateField label="Due" value={project.dueDate} onSave={(dueDate) => void save({ dueDate })} />
        <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
          Hours per week
          <input
            className={inputClass}
            type="number"
            min={0}
            max={80}
            defaultValue={project.hoursPerWeek}
            onBlur={(event) => void save({ hoursPerWeek: Number(event.target.value) })}
          />
        </label>
        <BlurText label="Next action" value={project.nextAction} maxLength={120} onSave={(nextAction) => save({ nextAction })} />
        <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
          Notes
          <textarea className={`${inputClass} min-h-28`} defaultValue={project.notes} onBlur={(event) => void save({ notes: event.target.value })} />
        </label>
        <LinksField links={project.links} onSave={(links) => void save({ links })} />
        <ProjectEvents projectId={project.id} events={events} />
      </div>
      <footer className="flex items-center justify-between gap-2 border-t border-line px-5 py-3">
        {confirming ? (
          <div className="flex flex-1 items-center justify-between gap-2">
            <p className="text-[13px] text-ink-2">Delete {project.name} and its dates?</p>
            <button type="button" className="rounded-full px-3 py-1.5 text-[13px] text-ink-2" onClick={() => setConfirming(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="rounded-full bg-[#B3261E] px-3 py-1.5 text-[13px] text-white"
              onClick={() => {
                void commands.mutations.deleteProject.mutateAsync(project.id).then(() => commands.ui.closeProject())
              }}
            >
              Delete permanently
            </button>
          </div>
        ) : (
          <>
            <button type="button" className="rounded-full px-3 py-1.5 text-[13px] text-ink-2 hover:bg-surface-muted" onClick={() => commands.archive(project)}>
              Archive
            </button>
            <button type="button" className="rounded-full px-3 py-1.5 text-[13px] text-[#B3261E]" onClick={() => setConfirming(true)}>
              Delete
            </button>
          </>
        )}
      </footer>
    </div>
  )
}

function CreateSheet({ stage }: { stage: Stage }) {
  const commands = useCommands()
  const [draft, setDraft] = useState<ProjectCreate>({
    name: "",
    client: "",
    description: "",
    type: "Other",
    stage,
    status: "On track",
    colour: "Lagoon",
    progress: 0,
    priority: 2,
    startDate: null,
    dueDate: null,
    hoursPerWeek: 0,
    nextAction: "",
    notes: "",
    links: [],
    sortOrder: 0,
    pinned: false,
    archived: false,
  })
  const [attempted, setAttempted] = useState(false)
  const parsed = projectCreateSchema.safeParse(draft)
  const issues = parsed.success || !attempted ? [] : parsed.error.issues

  return (
    <SheetFrame title="New project" description="It appears in the stage you choose.">
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault()
          setAttempted(true)
          if (!parsed.success) return
          void commands.mutations.createProject.mutateAsync(parsed.data).then((created) => {
            commands.ui.setSessionFocusId(created.id)
            commands.ui.closeProject()
          })
        }}
      >
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
            Name
            <input className={inputClass} value={draft.name} maxLength={60} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </label>
          <FieldError issues={issues} field="name" />
          <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
            Client
            <input className={inputClass} value={draft.client} onChange={(event) => setDraft({ ...draft, client: event.target.value })} />
          </label>
          <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
            Description
            <input className={inputClass} value={draft.description} maxLength={80} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
          </label>
          <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
            Type
            <select className={inputClass} value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as Project["type"] })}>
              {PROJECT_TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">Stage</legend>
            <div className="mt-2 flex flex-wrap gap-1">
              {STAGES.map((item) => (
                <button key={item} type="button" aria-pressed={draft.stage === item} className={cn("rounded-full px-2.5 py-1 text-[12px]", draft.stage === item ? "bg-ink text-white" : "bg-surface-muted text-ink-2")} onClick={() => setDraft({ ...draft, stage: item })}>
                  {item}
                </button>
              ))}
            </div>
          </fieldset>
          <ColourField value={draft.colour} onSave={(colour) => setDraft({ ...draft, colour })} />
          <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
            Next action
            <input className={inputClass} value={draft.nextAction} maxLength={120} onChange={(event) => setDraft({ ...draft, nextAction: event.target.value })} />
          </label>
        </div>
        <footer className="border-t border-line px-5 py-3">
          <button type="submit" disabled={!parsed.success} className="w-full rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40">
            Create
          </button>
        </footer>
      </form>
    </SheetFrame>
  )
}

function SheetFrame({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <>
      <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <Dialog.Title className="text-[20px] font-medium tracking-tight">{title}</Dialog.Title>
          <Dialog.Description className="mt-1 text-[13px] text-ink-3">{description ?? "Project details"}</Dialog.Description>
        </div>
        <Dialog.Close className="grid h-8 w-8 place-items-center rounded-full text-ink-2 hover:bg-surface-muted" aria-label="Close">
          <X strokeWidth={1.5} className="h-4 w-4" />
        </Dialog.Close>
      </header>
      {children}
    </>
  )
}

function Saved({ saved }: { saved: boolean }) {
  if (!saved) return null
  return (
    <p className="inline-flex items-center gap-1 text-[12px] text-[#17694A]" role="status">
      <Check strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden="true" /> Saved
    </p>
  )
}

function BlurText({ label, value, onSave, maxLength }: { label: string; value: string; onSave: (value: string) => Promise<unknown> | void; maxLength?: number }) {
  return (
    <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
      {label}
      <input className={inputClass} defaultValue={value} maxLength={maxLength} onBlur={(event) => { if (event.target.value !== value) void onSave(event.target.value) }} />
    </label>
  )
}

function ColourField({ value, onSave }: { value: Project["colour"]; onSave: (colour: Project["colour"]) => void }) {
  return (
    <fieldset>
      <legend className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">Colour</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {COLOURS.map((colour) => (
          <button
            key={colour}
            type="button"
            aria-label={colour}
            aria-pressed={value === colour}
            className="h-7 w-7 rounded-full ring-offset-2"
            style={{ background: swatch(colour).accent, boxShadow: value === colour ? `0 0 0 2px white, 0 0 0 4px ${swatch(colour).accent}` : undefined }}
            onClick={() => onSave(colour)}
          />
        ))}
      </div>
    </fieldset>
  )
}

function DateField({ label, value, onSave }: { label: string; value: string | null; onSave: (value: string | null) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
        {label}
        <input className={inputClass} type="date" value={value ?? ""} onChange={(event) => onSave(event.target.value || null)} />
      </label>
      <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
        Or type a date
        <input
          className={inputClass}
          defaultValue={value ?? ""}
          placeholder="29 Oct"
          aria-label={`${label} typed date`}
          onBlur={(event) => onSave(readDate(event.target.value))}
        />
      </label>
    </div>
  )
}

function readDate(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const parsed = parse(trimmed, new Date(), { forwardDate: true })[0]?.start.date()
  return parsed ? format(parsed, "yyyy-MM-dd") : null
}

function LinksField({ links, onSave }: { links: Link[]; onSave: (links: Link[]) => void }) {
  const [label, setLabel] = useState("")
  const [url, setUrl] = useState("")
  const [error, setError] = useState("")
  return (
    <fieldset>
      <legend className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">Links</legend>
      <ul className="mt-2 space-y-1">
        {links.map((link) => (
          <li key={link.url} className="flex items-center justify-between gap-2 text-[13px]">
            <a className="truncate text-brand underline" href={link.url}>
              {link.label}
            </a>
            <button type="button" className="text-[12px] text-ink-3" onClick={() => onSave(links.filter((item) => item.url !== link.url))}>
              Remove {link.label}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-2">
        <input className={inputClass} placeholder="Label" aria-label="Link label" value={label} onChange={(event) => setLabel(event.target.value)} />
        <input className={inputClass} placeholder="https://" aria-label="Link URL" value={url} onChange={(event) => setUrl(event.target.value)} />
        <button
          type="button"
          className="rounded-full bg-surface-muted px-3 text-[12px]"
          onClick={() => {
            const parsed = z.object({ label: z.string().min(1).max(60), url: z.url() }).safeParse({ label, url })
            if (!parsed.success) {
              setError("Use a name and a full URL.")
              return
            }
            setError("")
            onSave([...links, parsed.data])
            setLabel("")
            setUrl("")
          }}
        >
          Add link
        </button>
      </div>
      {error ? <p className="mt-1 text-[12px] text-[#B3261E]">{error}</p> : null}
    </fieldset>
  )
}

function ProjectEvents({ projectId, events }: { projectId: string; events: StudioEvent[] }) {
  const commands = useCommands()
  return (
    <section>
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">Dates</h3>
        <button type="button" className="text-[12px] font-medium text-brand" onClick={() => commands.ui.openNewEvent({ projectId, date: dayIso(new Date()) })}>
          Add date
        </button>
      </div>
      <ul className="mt-2 space-y-1">
        {events.map((event) => (
          <li key={event.id} className="flex items-center justify-between gap-2 text-[13px]">
            <button type="button" className="truncate text-left" onClick={() => commands.ui.openEvent(event.id)}>
              {event.title}
            </button>
            <button
              type="button"
              className="text-[12px] text-ink-3"
              onClick={() => {
                const { id, ...rest } = event
                void commands.mutations.deleteEvent.mutateAsync(id).then(() => {
                  undoToast("Deleted date", () => commands.mutations.createEvent.mutateAsync(rest satisfies EventCreate))
                })
              }}
            >
              Delete {event.title}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function FieldError({ issues, field }: { issues: { path: PropertyKey[]; message: string }[]; field: string }) {
  const message = issues.find((issue) => issue.path[0] === field)?.message
  if (!message) return null
  const readable = message.startsWith("Too small") ? "Give it a name." : message
  return <p className="text-[12px] text-[#B3261E]">{readable}</p>
}
