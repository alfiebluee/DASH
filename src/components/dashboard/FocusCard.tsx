import { ArrowRight, Pin } from "lucide-react"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import * as Tooltip from "@radix-ui/react-tooltip"
import { useState } from "react"
import type { Project, Settings } from "../../data/schemas.ts"
import { STAGES, STATUSES } from "../../data/schemas.ts"
import { deadlineReadout } from "../../lib/focus.ts"
import { useCommands } from "../../lib/commands.ts"
import { cn } from "../../lib/cn.ts"
import { swatch, statusStyles } from "../../styles/tokens.ts"
import { Eyebrow } from "../ui/Primitives.tsx"
import { TickNumber } from "../ui/TickNumber.tsx"
import { ProgressRing } from "../ui/Primitives.tsx"

export function FocusCard({
  project,
  settings,
  now,
}: {
  project: Project | null
  settings: Settings
  now: Date
}) {
  const commands = useCommands()
  if (!project) {
    return (
      <article className="flex h-full min-h-[320px] flex-col justify-between rounded-[28px] border border-line bg-surface p-6 shadow-card backdrop-blur-xl">
        <Eyebrow>Focus</Eyebrow>
        <div>
          <h2 className="text-[28px] font-light tracking-tight">Nothing active</h2>
          <p className="mt-1 text-sm text-ink-2">Add a project to give the day a centre.</p>
        </div>
        <button type="button" className="mt-6 w-fit rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover" onClick={() => commands.ui.openNewProject()}>
          Add a project
        </button>
      </article>
    )
  }

  const colours = swatch(project.colour)
  const readout = deadlineReadout(project, now)
  const stageIndex = STAGES.indexOf(project.stage)

  return (
    <article
      className="flex h-full min-h-[320px] flex-col rounded-[28px] border border-white/70 p-6 shadow-card"
      style={{ background: colours.tint }}
    >
      <div className="flex items-center justify-between gap-3">
        <Eyebrow>Focus</Eyebrow>
        <div className="flex items-center gap-2">
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                type="button"
                aria-label={project.pinned ? "Unpin from Focus" : "Pin to Focus"}
                aria-pressed={project.pinned}
                className="grid h-8 w-8 place-items-center rounded-full text-ink-2 hover:bg-white/70"
                onClick={() => void commands.pin(project, !project.pinned)}
              >
                <Pin strokeWidth={1.5} className="h-3.5 w-3.5" />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                side="top"
                className="rounded-full bg-ink px-2.5 py-1 text-[11px] text-white"
              >
                {project.pinned ? "Unpin" : "Pin to Focus"}
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
          <StatusMenu project={project} />
        </div>
      </div>

      <h2 className="mt-4 text-[30px] font-normal leading-[1.05] tracking-[-0.03em] text-ink sm:text-[34px]">
        <button type="button" className="text-left" onClick={() => commands.ui.openProject(project.id)}>
          {project.name}
        </button>
      </h2>
      <p className="mt-1 text-[14px] text-ink-2">
        {project.description ? `${project.description} · ${project.type}` : project.type}
      </p>

      <div className="mt-6 flex items-center gap-5">
        <ProgressRing value={project.progress} colour={colours.accent} label={`${project.progress}%`} />
        <div>
          <p className="text-[64px] font-extralight leading-none tracking-[-0.04em] text-ink">
            {readout.numeric === null ? readout.figure : <TickNumber value={readout.numeric} />}
          </p>
          <p className="mt-1 max-w-[220px] text-[13px] leading-snug text-ink-2">{readout.caption}</p>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex gap-1" aria-hidden="true">
          {STAGES.map((stage, index) => (
            <span
              key={stage}
              className="h-[3px] flex-1 rounded-full"
              style={{ background: index <= stageIndex ? colours.accent : "rgba(15,28,36,0.10)" }}
            />
          ))}
        </div>
        <div className="mt-2 flex" role="group" aria-label="Stage">
          {settings.stageLabels.map((label, index) => (
            <button
              key={label}
              type="button"
              aria-pressed={index === stageIndex}
              className={cn(
                "flex-1 text-center text-[11px]",
                index === stageIndex ? "font-medium text-ink" : "text-ink-3",
              )}
              onClick={() => {
                const stage = STAGES[index]
                if (stage) void commands.setStage(project.id, stage)
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto flex items-center gap-3 rounded-full bg-white/80 px-2 py-2 pt-2 shadow-sm">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-ink-2">
          <ArrowRight strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <NextAction project={project} />
        <span className="pr-2 text-[12px] text-ink-3">Next</span>
      </div>
    </article>
  )
}

function StatusMenu({ project }: { project: Project }) {
  const commands = useCommands()
  const style = statusStyles[project.status]
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium leading-none"
        style={{ color: style.color, background: style.background }}
        aria-label={`Change status, ${project.status}`}
      >
        {project.status}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="z-[80] min-w-36 rounded-2xl border border-line bg-white p-1 text-[13px] shadow-lift">
          {STATUSES.map((status) => (
            <DropdownMenu.Item
              key={status}
              className="rounded-xl px-3 py-1.5 outline-none data-[highlighted]:bg-surface-muted"
              onSelect={() => void commands.setStatus(project.id, status)}
            >
              {status}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function focusOnce(node: HTMLInputElement | null) {
  if (!node || node.dataset.focused === "true") return
  node.dataset.focused = "true"
  node.focus()
}

function NextAction({ project }: { project: Project }) {
  const commands = useCommands()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(project.nextAction)
  if (!editing) {
    return (
      <button
        type="button"
        className="min-w-0 flex-1 text-left text-[13px] leading-snug text-ink"
        aria-label={project.nextAction ? `Edit next action, ${project.nextAction}` : "Add a next action"}
        onClick={() => {
          setDraft(project.nextAction)
          setEditing(true)
        }}
      >
        {project.nextAction || "Add a next action"}
      </button>
    )
  }
  return (
    <input
      aria-label="Next action"
      className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none"
      value={draft}
      ref={focusOnce}
      maxLength={120}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => setEditing(false)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          void commands.saveProject(project.id, { nextAction: draft })
          setEditing(false)
        }
        if (event.key === "Escape") setEditing(false)
      }}
    />
  )
}
