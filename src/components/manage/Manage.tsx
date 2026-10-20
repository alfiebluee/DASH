import * as Tabs from "@radix-ui/react-tabs"
import { format } from "date-fns"
import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  PROJECT_TYPES,
  STAGES,
  STATUSES,
  TIMELINE_WEEKS,
  type Project,
  type Settings,
  type Stage,
  type Status,
  type StudioEvent,
} from "../../data/schemas.ts"
import { daysFromToday, fortnightDays, shortDate } from "../../lib/dates.ts"
import { motionHeadline } from "../../lib/headline.ts"
import { isAtRisk, isInMotion } from "../../lib/projects.ts"
import { useCommands } from "../../lib/commands.ts"
import { undoToast } from "../../lib/mutations.ts"
import type { StudioSnapshot } from "../../lib/studio.tsx"
import { cn } from "../../lib/cn.ts"
import { swatch } from "../../styles/tokens.ts"
import { Header } from "../dashboard/Header.tsx"
import { Page } from "../dashboard/Page.tsx"
import { Card } from "../ui/Primitives.tsx"

const TABS = ["projects", "events", "settings", "archive"] as const

export function ManageView({ snapshot, now }: { snapshot: StudioSnapshot; now: Date }) {
  const [params, setParams] = useSearchParams()
  const tab = TABS.includes(params.get("tab") as (typeof TABS)[number]) ? (params.get("tab") as (typeof TABS)[number]) : "projects"
  const headline = motionHeadline(snapshot.projects, now)
  const nearestTint = headline.nearest ? swatch(headline.nearest.colour).tint : "#ECECFB"
  const nudgeTint = headline.nudge ? swatch(headline.nudge.colour).tint : "#FFECE9"

  function setTab(value: string) {
    const next = new URLSearchParams(params)
    next.set("tab", value)
    setParams(next)
  }

  return (
    <Page>
      <Header now={now} settings={snapshot.settings} showGreeting={false} withYear />
      <h1 className="mt-6 max-w-[920px] text-[32px] font-light leading-[1.15] tracking-[-0.03em] text-ink sm:text-[42px]">
        {headline.countLabel} {headline.projectWord} in motion.
        {headline.nearest && headline.when ? (
          <>
            {" "}
            <mark className="rounded-md px-1 text-inherit" style={{ background: nearestTint }}>
              {shortName(headline.nearest.name)}
            </mark>{" "}
            hands off {headline.when}{headline.nudge ? (
              <>
                {", and "}
                <mark className="rounded-md px-1 text-inherit" style={{ background: nudgeTint }}>
                  {headline.nudge.name}
                </mark>{" "}
                <span className="italic">needs a nudge.</span>
              </>
            ) : (
              "."
            )}
          </>
        ) : null}
      </h1>

      <Tabs.Root value={tab} onValueChange={setTab} className="mt-8">
        <Tabs.List className="flex gap-1 rounded-full bg-white/70 p-1 shadow-card" aria-label="Manage">
          {TABS.map((item) => (
            <Tabs.Trigger
              key={item}
              value={item}
              className="rounded-full px-4 py-1.5 text-[13px] capitalize text-ink-2 data-[state=active]:bg-white data-[state=active]:text-ink data-[state=active]:shadow-sm"
            >
              {item}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <Tabs.Content value="projects" className="mt-4">
          <ProjectsPanel snapshot={snapshot} now={now} />
        </Tabs.Content>
        <Tabs.Content value="events" className="mt-4">
          <EventsPanel snapshot={snapshot} now={now} />
        </Tabs.Content>
        <Tabs.Content value="settings" className="mt-4">
          <SettingsPanel settings={snapshot.settings} />
        </Tabs.Content>
        <Tabs.Content value="archive" className="mt-4">
          <ArchivePanel projects={snapshot.projects} />
        </Tabs.Content>
      </Tabs.Root>
    </Page>
  )
}

function ProjectsPanel({ snapshot, now }: { snapshot: StudioSnapshot; now: Date }) {
  const commands = useCommands()
  const [params, setParams] = useSearchParams()
  const [selected, setSelected] = useState<string[]>([])
  const q = (params.get("q") ?? "").toLowerCase()
  const stage = params.get("stage")
  const status = params.get("status")
  const type = params.get("type")
  const scope = params.get("scope")
  const sort = params.get("sort") ?? "due"
  const dir = params.get("dir") === "desc" ? "desc" : "asc"

  const rows = snapshot.projects
    .filter((project) => !project.archived)
    .filter((project) => (q ? `${project.name} ${project.client} ${project.nextAction}`.toLowerCase().includes(q) : true))
    .filter((project) => (stage ? project.stage === stage : true))
    .filter((project) => (status ? project.status === status : true))
    .filter((project) => (type ? project.type === type : true))
    .filter((project) => (scope === "active" ? isInMotion(project) : true))
    .filter((project) => (scope === "risk" ? isAtRisk(project) : true))
    .sort((a, b) => compareProjects(a, b, sort) * (dir === "desc" ? -1 : 1))

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }

  function toggleSort(key: string) {
    const next = new URLSearchParams(params)
    next.set("sort", key)
    next.set("dir", sort === key && dir === "asc" ? "desc" : "asc")
    setParams(next)
  }

  const filtered = Boolean(q || stage || status || type || scope)

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <input
          aria-label="Search projects"
          className="rounded-full border border-line bg-white px-3 py-1.5 text-[13px]"
          placeholder="Search"
          value={params.get("q") ?? ""}
          onChange={(event) => setParam("q", event.target.value || null)}
        />
        <FilterChip label="Active" pressed={scope === "active"} onClick={() => setParam("scope", scope === "active" ? null : "active")} />
        <FilterChip label="At risk" pressed={scope === "risk"} onClick={() => setParam("scope", scope === "risk" ? null : "risk")} />
        {STAGES.map((item) => (
          <FilterChip key={item} label={item} pressed={stage === item} onClick={() => setParam("stage", stage === item ? null : item)} />
        ))}
        {STATUSES.map((item) => (
          <FilterChip key={item} label={item} pressed={status === item} onClick={() => setParam("status", status === item ? null : item)} />
        ))}
        {PROJECT_TYPES.map((item) => (
          <FilterChip key={item} label={item} pressed={type === item} onClick={() => setParam("type", type === item ? null : item)} />
        ))}
        {filtered ? (
          <button type="button" className="text-[12px] text-brand" onClick={() => setParams({ tab: "projects" })}>
            Clear filters
          </button>
        ) : null}
      </div>
      {selected.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2 text-[13px]">
          <span>{selected.length} selected</span>
          <select aria-label="Set stage" defaultValue="" onChange={(event) => {
            const value = event.target.value as Stage
            if (!value) return
            void commands.mutations.patchProjects.mutateAsync(selected.map((id) => ({ id, patch: { stage: value } })))
            event.target.value = ""
          }}>
            <option value="">Set stage</option>
            {STAGES.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select aria-label="Set status" defaultValue="" onChange={(event) => {
            const value = event.target.value as Status
            if (!value) return
            void commands.mutations.patchProjects.mutateAsync(selected.map((id) => ({ id, patch: { status: value } })))
            event.target.value = ""
          }}>
            <option value="">Set status</option>
            {STATUSES.map((item) => <option key={item}>{item}</option>)}
          </select>
          <button
            type="button"
            onClick={() => {
              const ids = selected.slice()
              void commands.mutations.patchProjects.mutateAsync(ids.map((id) => ({ id, patch: { archived: true } }))).then(() => {
                setSelected([])
                undoToast("Archived", () => commands.mutations.patchProjects.mutateAsync(ids.map((id) => ({ id, patch: { archived: false } }))))
              })
            }}
          >
            Archive
          </button>
        </div>
      ) : null}
      {rows.length === 0 ? (
        <Empty
          line="Nothing matches these filters."
          action="Clear filters"
          onAction={() => setParams({ tab: "projects" })}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">
                <th className="px-4 py-3" />
                {["name", "client", "stage", "status", "due", "progress", "priority"].map((key) => (
                  <th key={key} className="px-3 py-3">
                    <button type="button" onClick={() => toggleSort(key)} aria-label={`Sort by ${key}`}>
                      {key}
                    </button>
                  </th>
                ))}
                <th className="px-3 py-3">Next</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((project) => (
                <tr key={project.id} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${project.name}`}
                      checked={selected.includes(project.id)}
                      onChange={() => setSelected((current) => current.includes(project.id) ? current.filter((id) => id !== project.id) : [...current, project.id])}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <button type="button" className="font-medium text-ink" onClick={() => commands.ui.openProject(project.id)}>
                      {project.name}
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <input
                      aria-label={`Client for ${project.name}`}
                      className="w-full bg-transparent"
                      defaultValue={project.client}
                      key={project.client}
                      onBlur={(event) => {
                        if (event.target.value !== project.client) void commands.saveProject(project.id, { client: event.target.value })
                      }}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <select aria-label={`Stage for ${project.name}`} value={project.stage} onChange={(event) => void commands.setStage(project.id, event.target.value as Stage)}>
                      {STAGES.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <select aria-label={`Status for ${project.name}`} value={project.status} onChange={(event) => void commands.setStatus(project.id, event.target.value as Status)}>
                      {STATUSES.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-3" style={{ color: project.status === "At risk" || project.status === "Blocked" ? "#B3261E" : undefined }}>
                    <input
                      aria-label={`Due date for ${project.name}`}
                      type="date"
                      value={project.dueDate ?? ""}
                      onChange={(event) => void commands.saveProject(project.id, { dueDate: event.target.value || null })}
                    />
                    <span className="block text-[12px] text-ink-3">{dueCaption(project, now)}</span>
                  </td>
                  <td className="px-3 py-3">
                    <input
                      aria-label={`Progress for ${project.name}`}
                      type="number"
                      min={0}
                      max={100}
                      className="w-16 bg-transparent"
                      defaultValue={project.progress}
                      key={project.progress}
                      onBlur={(event) => void commands.saveProject(project.id, { progress: Number(event.target.value) })}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <select aria-label={`Priority for ${project.name}`} value={project.priority} onChange={(event) => void commands.saveProject(project.id, { priority: Number(event.target.value) as 1 | 2 | 3 })}>
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                    </select>
                  </td>
                  <td className="px-3 py-3 text-ink-2">{project.nextAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function EventsPanel({ snapshot, now }: { snapshot: StudioSnapshot; now: Date }) {
  const commands = useCommands()
  const [params, setParams] = useSearchParams()
  const day = params.get("day")
  const days = fortnightDays(now)
  const events = snapshot.events
    .filter((event) => !day || event.date === day)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
  const months = new Map<string, StudioEvent[]>()
  for (const event of events) {
    const key = event.date.slice(0, 7)
    months.set(key, [...(months.get(key) ?? []), event])
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <Card className="p-4">
        <h2 className="text-[14px] font-medium">{format(now, "MMMM yyyy")}</h2>
        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px]">
          {Array.from({ length: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() }, (_, index) => {
            const date = new Date(now.getFullYear(), now.getMonth(), index + 1)
            const iso = format(date, "yyyy-MM-dd")
            const marked = snapshot.events.some((event) => event.date === iso && !event.done)
            return (
              <button
                key={iso}
                type="button"
                aria-pressed={day === iso}
                aria-label={shortDate(iso)}
                className={cn("rounded-full py-1", day === iso ? "bg-ink text-white" : marked ? "bg-brand-tint text-ink" : "text-ink-2")}
                onClick={() => {
                  const next = new URLSearchParams(params)
                  if (day === iso) next.delete("day")
                  else next.set("day", iso)
                  next.set("tab", "events")
                  setParams(next)
                }}
              >
                {index + 1}
              </button>
            )
          })}
        </div>
        <button type="button" className="mt-4 text-[12px] font-medium text-brand" onClick={() => commands.ui.openNewEvent({ date: day ?? format(now, "yyyy-MM-dd") })}>
          New date
        </button>
      </Card>
      <div className="space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {days.map((date) => {
            const iso = format(date, "yyyy-MM-dd")
            const happenings = snapshot.events.filter((event) => event.date === iso && !event.done && event.kind !== "Away")
            return (
              <button
                key={iso}
                type="button"
                aria-pressed={day === iso}
                className={cn("min-w-[92px] rounded-2xl px-3 py-2 text-left", iso === format(now, "yyyy-MM-dd") ? "bg-ink text-white" : "bg-white/80")}
                onClick={() => {
                  const next = new URLSearchParams(params)
                  next.set("tab", "events")
                  next.set("day", iso)
                  setParams(next)
                }}
              >
                <span className="block text-[11px]">{shortDate(iso)}</span>
                <span className="block truncate text-[12px]">{happenings[0]?.title ?? "Open"}</span>
              </button>
            )
          })}
        </div>
        {[...months.entries()].map(([key, group]) => (
          <section key={key}>
            <h2 className="text-[13px] font-medium text-ink-3">{format(new Date(`${key}-01T00:00:00`), "MMMM yyyy")}</h2>
            <ul className="mt-2 space-y-2">
              {group.map((event) => (
                <li key={event.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/80 px-4 py-3">
                  <button type="button" className="min-w-0 text-left" onClick={() => commands.ui.openEvent(event.id)}>
                    <span className={cn("block text-[14px]", event.done && "line-through")}>{event.title}</span>
                    <span className="block text-[12px] text-ink-3">{event.kind} · {shortDate(event.date)}</span>
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-[12px] text-ink-2"
                      onClick={() => {
                        void commands.mutations.updateEvent.mutateAsync({ id: event.id, patch: { done: !event.done } }).then(() => {
                          undoToast(event.done ? "Marked not done" : "Marked done", () =>
                            commands.mutations.updateEvent.mutateAsync({ id: event.id, patch: { done: event.done } }),
                          )
                        })
                      }}
                    >
                      {event.done ? "Undo done" : "Done"}
                    </button>
                    <button
                      type="button"
                      className="text-[12px] text-[#B3261E]"
                      onClick={() => {
                        const { id, ...rest } = event
                        void commands.mutations.deleteEvent.mutateAsync(id).then(() => {
                          undoToast("Deleted date", () => commands.mutations.createEvent.mutateAsync(rest))
                        })
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {events.length === 0 ? <Empty line="No dates on this day." action="New date" onAction={() => commands.ui.openNewEvent({ date: day ?? format(now, "yyyy-MM-dd") })} /> : null}
      </div>
    </div>
  )
}

function SettingsPanel({ settings }: { settings: Settings }) {
  const commands = useCommands()
  const [params] = useSearchParams()
  const focus = params.get("focus")
  useEffect(() => {
    if (focus === "capacity") document.getElementById("weekly-capacity")?.focus()
  }, [focus])

  return (
    <Card className="max-w-xl space-y-4 p-5">
      <label className="block text-[13px]">
        Greeting name
        <input
          aria-label="Greeting name"
          className="mt-1 w-full rounded-xl border border-line px-3 py-2"
          defaultValue={settings.greetingName}
          key={settings.greetingName}
          onBlur={(event) => {
            if (event.target.value.trim() && event.target.value !== settings.greetingName) {
              void commands.mutations.updateSettings.mutateAsync({ greetingName: event.target.value.trim() })
            }
          }}
        />
      </label>
      <label className="block text-[13px]">
        Weekly capacity
        <input
          id="weekly-capacity"
          aria-label="Weekly capacity"
          type="number"
          min={1}
          max={168}
          className="mt-1 w-full rounded-xl border border-line px-3 py-2"
          defaultValue={settings.weeklyCapacityHours}
          key={settings.weeklyCapacityHours}
          onBlur={(event) => {
            const value = Number(event.target.value)
            if (value > 0 && value !== settings.weeklyCapacityHours) {
              void commands.mutations.updateSettings.mutateAsync({ weeklyCapacityHours: value })
            }
          }}
        />
      </label>
      <fieldset>
        <legend className="text-[13px]">Stage labels</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {settings.stageLabels.map((label, index) => (
            <input
              key={`${STAGES[index]}-${label}`}
              aria-label={`Label for ${STAGES[index]}`}
              className="rounded-xl border border-line px-3 py-2 text-[13px]"
              defaultValue={label}
              onBlur={(event) => {
                const next = settings.stageLabels.slice() as Settings["stageLabels"]
                const value = event.target.value.trim()
                if (!value || value === label) return
                next[index] = value
                void commands.mutations.updateSettings.mutateAsync({ stageLabels: next })
              }}
            />
          ))}
        </div>
      </fieldset>
      <label className="block text-[13px]">
        Timeline
        <select
          aria-label="Timeline weeks"
          className="mt-1 w-full rounded-xl border border-line px-3 py-2"
          value={settings.timelineWeeks}
          onChange={(event) => {
            const value = Number(event.target.value)
            if (value === 4 || value === 6 || value === 8) {
              void commands.mutations.updateSettings.mutateAsync({ timelineWeeks: value })
            }
          }}
        >
          {TIMELINE_WEEKS.map((weeks) => (
            <option key={weeks} value={weeks}>{weeks} weeks</option>
          ))}
        </select>
      </label>
    </Card>
  )
}

function ArchivePanel({ projects }: { projects: Project[] }) {
  const commands = useCommands()
  const [confirming, setConfirming] = useState<string | null>(null)
  const archived = projects.filter((project) => project.archived)
  if (archived.length === 0) {
    return <Empty line="Nothing is archived." action="Back to projects" href="/manage?tab=projects" />
  }
  return (
    <Card className="divide-y divide-line">
      {archived.map((project) => (
        <div key={project.id} className="flex items-center justify-between gap-3 px-5 py-3">
          <p className="text-[14px]">{project.name}</p>
          <div className="flex gap-2">
            <button type="button" className="text-[13px] text-brand" onClick={() => void commands.saveProject(project.id, { archived: false })}>
              Restore {project.name}
            </button>
            {confirming === project.id ? (
              <button
                type="button"
                className="text-[13px] text-[#B3261E]"
                onClick={() => void commands.mutations.deleteProject.mutateAsync(project.id)}
              >
                Confirm delete {project.name}
              </button>
            ) : (
              <button type="button" className="text-[13px] text-[#B3261E]" onClick={() => setConfirming(project.id)}>
                Delete {project.name}
              </button>
            )}
          </div>
        </div>
      ))}
    </Card>
  )
}

function Empty({ line, action, onAction, href }: { line: string; action: string; onAction?: () => void; href?: string }) {
  if (href) {
    return (
      <div className="rounded-[28px] bg-white/80 p-6">
        <p className="text-[14px] text-ink-2">{line}</p>
        <Link className="mt-3 inline-block text-[13px] font-medium text-brand" to={href}>{action}</Link>
      </div>
    )
  }
  return (
    <div className="p-6">
      <p className="text-[14px] text-ink-2">{line}</p>
      <button type="button" className="mt-3 text-[13px] font-medium text-brand" onClick={onAction}>{action}</button>
    </div>
  )
}

function FilterChip({ label, pressed, onClick }: { label: string; pressed: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={pressed} className={cn("rounded-full px-3 py-1 text-[12px]", pressed ? "bg-ink text-white" : "bg-surface-muted text-ink-2")} onClick={onClick}>
      {label}
    </button>
  )
}

function compareProjects(a: Project, b: Project, sort: string): number {
  if (sort === "name") return a.name.localeCompare(b.name)
  if (sort === "client") return a.client.localeCompare(b.client)
  if (sort === "stage") return STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage)
  if (sort === "status") return a.status.localeCompare(b.status)
  if (sort === "progress") return a.progress - b.progress
  if (sort === "priority") return a.priority - b.priority
  if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
  if (a.dueDate) return -1
  return 1
}

function dueCaption(project: Project, now: Date): string {
  if (!project.dueDate) return project.stage === "Live" ? "Retainer" : "No date"
  const days = daysFromToday(project.dueDate, now)
  const unit = Math.abs(days) === 1 ? "day" : "days"
  return `${days} ${unit}`
}

function shortName(name: string): string {
  const [first, second] = name.split(" ")
  if (!second) return name
  if (second === "Places" || second === "Labs" || second === "Carpets" || second === "Tiles" || second === "Interiors") return name
  return first ?? name
}
