import { useDraggable } from "@dnd-kit/core"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { COLOURS, type Colour, type Project, type Settings, type StudioEvent } from "../../data/schemas.ts"
import { upNext } from "../../lib/agenda.ts"
import { atRiskCount, capacityFor, dueThisWeekCount } from "../../lib/capacity.ts"
import { nextEvent } from "../../lib/projects.ts"
import { shortDate } from "../../lib/dates.ts"
import { useCommands } from "../../lib/commands.ts"
import { undoToast } from "../../lib/mutations.ts"
import { capacityColours, swatch } from "../../styles/tokens.ts"
import { Card, ProgressRing, StatusPill } from "../ui/Primitives.tsx"
import { TickNumber } from "../ui/TickNumber.tsx"

export function UpNext({ projects, events, now }: { projects: Project[]; events: StudioEvent[]; now: Date }) {
  const commands = useCommands()
  const items = upNext(projects, events, now)
  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[16px] font-medium tracking-tight">Up next</h2>
        <button type="button" className="text-[12px] font-medium text-brand" onClick={() => commands.ui.openNewEvent()}>
          + Add date
        </button>
      </div>
      <ul className="mt-4 flex flex-1 flex-col gap-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2">
            {item.eventId ? (
              <input
                type="checkbox"
                aria-label={`Mark ${item.title} done`}
                className="h-4 w-4 shrink-0 accent-[#0E7490]"
                onChange={() => {
                  const eventId = item.eventId
                  if (!eventId) return
                  void commands.mutations.updateEvent.mutateAsync({ id: eventId, patch: { done: true } }).then(() => {
                    undoToast("Marked done", () => commands.mutations.updateEvent.mutateAsync({ id: eventId, patch: { done: false } }))
                  })
                }}
              />
            ) : (
              <span className="h-4 w-4 shrink-0" />
            )}
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 py-2 text-left"
              style={{ background: item.tint }}
              onClick={() => {
                if (item.eventId) commands.ui.openEvent(item.eventId)
                else if (item.projectId) commands.ui.openProject(item.projectId)
              }}
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.accent }} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate text-[13px] text-ink">{item.title}</span>
                <span className="block text-[11px] text-ink-3">
                  {shortDate(item.date)} · {item.detail}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function PipelinePanel({ projects, events }: { projects: Project[]; events: StudioEvent[] }) {
  const commands = useCommands()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState("")
  const [colour, setColour] = useState<Colour>("Lagoon")
  const ideas = projects
    .filter((project) => !project.archived && project.stage === "Pipeline")
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))

  function addIdea() {
    const trimmed = name.trim()
    if (!trimmed) return
    void commands.mutations.createProject
      .mutateAsync({
        name: trimmed.slice(0, 60),
        client: "",
        description: "",
        type: "Other",
        stage: "Pipeline",
        status: "On track",
        colour,
        progress: 0,
        priority: 2,
        startDate: null,
        dueDate: null,
        hoursPerWeek: 0,
        nextAction: "",
        notes: "",
        links: [],
        sortOrder: ideas.length,
        pinned: false,
        archived: false,
      })
      .then(() => {
        setName("")
        setAdding(false)
      })
  }

  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[16px] font-medium tracking-tight">Pipeline</h2>
        <p className="text-[11px] text-ink-3">Drag onto a stage to start</p>
      </div>
      <div className="mt-4 flex flex-1 flex-col gap-2">
        {ideas.map((project) => (
          <IdeaTile key={project.id} project={project} events={events} />
        ))}
        {adding ? (
          <form
            className="rounded-[18px] bg-surface-muted px-4 py-3"
            onSubmit={(event) => {
              event.preventDefault()
              addIdea()
            }}
          >
            <input
              aria-label="Idea name"
              className="w-full bg-transparent text-[14px] outline-none"
              placeholder="Name the idea"
              value={name}
              maxLength={60}
              ref={focusOnce}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setAdding(false)
              }}
            />
            <div className="mt-2 flex flex-wrap gap-1">
              {COLOURS.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-label={item}
                  aria-pressed={colour === item}
                  className="h-5 w-5 rounded-full"
                  style={{ background: swatch(item).accent, outline: colour === item ? "2px solid #0F1C24" : undefined }}
                  onClick={() => setColour(item)}
                />
              ))}
            </div>
            <button type="submit" disabled={name.trim().length === 0} className="mt-2 text-[12px] font-medium text-brand disabled:opacity-40">
              Add idea
            </button>
          </form>
        ) : null}
      </div>
      {adding ? null : (
        <button
          type="button"
          className="mt-3 w-full rounded-full border border-dashed border-ink/15 py-2.5 text-[13px] text-ink-2 hover:bg-surface-muted"
          onClick={() => setAdding(true)}
        >
          + Add idea
        </button>
      )}
    </Card>
  )
}

function focusOnce(node: HTMLInputElement | null) {
  if (!node || node.dataset.focused === "true") return
  node.dataset.focused = "true"
  node.focus()
}

function IdeaTile({ project, events }: { project: Project; events: StudioEvent[] }) {
  const commands = useCommands()
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `idea:${project.id}` })
  const colours = swatch(project.colour)
  const upcoming = nextEvent(project.id, events)
  const meta = upcoming
    ? `${project.description} · ${upcoming.title.toLowerCase()} ${shortDate(upcoming.date)}`
    : project.description
  return (
    <button
      ref={setNodeRef}
      type="button"
      className="rounded-[18px] px-4 py-3 text-left"
      style={{ background: colours.tint, opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
      {...listeners}
      onClick={() => commands.ui.openProject(project.id)}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="text-[15px] font-medium text-ink">{project.name}</span>
        <StatusPill status={project.status} />
      </span>
      <span className="mt-1 block text-[12px] text-ink-2">{meta}</span>
    </button>
  )
}

export function Pulse({
  projects,
  events,
  settings,
  now,
}: {
  projects: Project[]
  events: StudioEvent[]
  settings: Settings
  now: Date
}) {
  const commands = useCommands()
  const navigate = useNavigate()
  const capacity = capacityFor(projects, settings.weeklyCapacityHours)
  const risk = atRiskCount(projects)
  const due = dueThisWeekCount(projects, events, now)
  const ring = capacityColours[capacity.tone]
  return (
    <Card className="flex h-full flex-col p-5">
      <h2 className="text-[16px] font-medium tracking-tight">Pulse</h2>
      <div className="mt-4 grid flex-1 grid-cols-2 gap-2">
        <Tile label="Active" value={capacity.active} onClick={() => navigate("/manage?tab=projects&scope=active")} />
        <Tile label="Due this week" value={due} onClick={() => commands.ui.flashDueThisWeek()} />
        <Tile label="At risk" value={risk} alert={risk > 0} onClick={() => navigate("/manage?tab=projects&scope=risk")} />
        <button
          type="button"
          aria-label={`Capacity, ${capacity.used} of ${capacity.weekly} hours`}
          className="flex flex-col justify-between rounded-[20px] bg-surface-muted p-3 text-left"
          onClick={() => navigate("/manage?tab=settings&focus=capacity")}
        >
          <p className="text-[12px] text-ink-3">Capacity</p>
          <div className="mt-2 flex items-center gap-2">
            <ProgressRing value={Math.min(100, capacity.ratio * 100)} colour={ring} size={42} stroke={4} />
            <p className="leading-tight">
              <span className="text-[22px] font-extralight tracking-[-0.04em] text-ink">
                <TickNumber value={capacity.used} />h
              </span>
              <span className="block text-[11px] text-ink-3">of {capacity.weekly}h</span>
            </p>
          </div>
        </button>
      </div>
    </Card>
  )
}

function Tile({ label, value, alert = false, onClick }: { label: string; value: number; alert?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={`${label}, ${value}`}
      className="flex flex-col justify-between rounded-[20px] p-3 text-left"
      style={{ background: alert ? "#FFECE9" : "#EBF2F4" }}
      onClick={onClick}
    >
      <p className="text-[12px] text-ink-3">{label}</p>
      <p className="mt-3 text-[40px] font-extralight leading-none tracking-[-0.04em] text-ink">
        <TickNumber value={value} />
      </p>
    </button>
  )
}
