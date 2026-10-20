/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex -- a stage card is a composite control with a nested menu */
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import * as ContextMenu from "@radix-ui/react-context-menu"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { MoreHorizontal, Plus } from "lucide-react"
import type { ReactNode } from "react"
import { COLOURS, STAGES, STATUSES, type Project, type Settings, type Stage, type StudioEvent } from "../../data/schemas.ts"
import { dueChip, visibleProjects } from "../../lib/projects.ts"
import { useCommands } from "../../lib/commands.ts"
import { cn } from "../../lib/cn.ts"
import { swatch } from "../../styles/tokens.ts"
import { Card } from "../ui/Primitives.tsx"

export function StageBoard({
  projects,
  events,
  settings,
  focusId,
  now,
}: {
  projects: Project[]
  events: StudioEvent[]
  settings: Settings
  focusId: string | null
  now: Date
}) {
  const commands = useCommands()
  const visible = visibleProjects(projects)
  return (
    <Card className="flex h-full flex-col p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-medium tracking-tight">Stages</h2>
          <p className="text-[12px] text-ink-3">
            {visible.length} {visible.length === 1 ? "project" : "projects"} · tap a card to focus it
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-[12px] font-medium text-white hover:bg-ink/90"
          onClick={() => commands.ui.openNewProject("Brief")}
        >
          <Plus strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden="true" />
          New
        </button>
      </div>
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="flex flex-col gap-2 md:min-w-[760px] md:flex-row lg:min-w-0">
          {STAGES.map((stage, index) => {
            const cards = visible
              .filter((project) => project.stage === stage)
              .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
            return (
              <Lane key={stage} stage={stage} label={settings.stageLabels[index] ?? stage} count={cards.length}>
                <SortableContext items={cards.map((project) => project.id)} strategy={verticalListSortingStrategy}>
                  {cards.map((project) => (
                    <StageCard key={project.id} project={project} events={events} focused={project.id === focusId} now={now} />
                  ))}
                </SortableContext>
              </Lane>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

function Lane({ stage, label, count, children }: { stage: Stage; label: string; count: number; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `lane:${stage}` })
  return (
    <section
      ref={setNodeRef}
      aria-label={label}
      className={cn(
        "flex w-full flex-col rounded-[20px] bg-surface-muted p-2 md:min-h-[250px] md:w-[148px] md:shrink-0 lg:w-auto lg:min-w-0 lg:flex-1",
        isOver && "ring-2 ring-brand",
      )}
    >
      <header className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">{label}</h3>
        <span className="text-[10px] text-ink-3">{count}</span>
      </header>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  )
}

function StageCard({
  project,
  events,
  focused,
  now,
}: {
  project: Project
  events: StudioEvent[]
  focused: boolean
  now: Date
}) {
  const commands = useCommands()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id })
  const colours = swatch(project.colour)
  const chip = dueChip(project, events, now)
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <article
          ref={setNodeRef}
          {...attributes}
          {...listeners}
          role="group"
          aria-label={project.name}
          tabIndex={0}
          className="rounded-[14px] bg-white p-2.5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lift motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          style={{
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.4 : 1,
            boxShadow: focused ? `0 0 0 2px ${colours.accent}, 0 8px 20px rgba(15,40,50,0.06)` : undefined,
          }}
          onClick={() => commands.ui.setSessionFocusId(project.id)}
          onDoubleClick={() => commands.ui.openProject(project.id)}
          onKeyDown={(event) => {
            listeners?.onKeyDown?.(event)
            if (event.defaultPrevented) return
            if (event.key === "Enter") commands.ui.openProject(project.id)
            const index = Number(event.key) - 1
            const stage = STAGES[index]
            if (stage) {
              event.preventDefault()
              void commands.setStage(project.id, stage)
            }
          }}
        >
          <div className="flex items-start gap-1.5">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: colours.accent }} aria-hidden="true" />
            <h4 className="min-w-0 flex-1 text-[13px] font-medium leading-tight text-ink">{project.name}</h4>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label={`Actions for ${project.name}`}
                  className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-surface-muted"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                >
                  <MoreHorizontal strokeWidth={1.5} className="h-3.5 w-3.5" />
                </button>
              </DropdownMenu.Trigger>
              <MenuBody project={project} Item={DropdownMenu.Item} Sub={DropdownMenu.Sub} SubTrigger={DropdownMenu.SubTrigger} SubContent={DropdownMenu.SubContent} Separator={DropdownMenu.Separator} portal={DropdownMenu.Portal} content={DropdownMenu.Content} />
            </DropdownMenu.Root>
          </div>
          <p className="mt-1 line-clamp-2 pl-3.5 text-[11px] leading-snug text-ink-3">{project.description}</p>
          <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-black/5" aria-hidden="true">
            <div className="h-full rounded-full" style={{ width: `${project.progress}%`, background: colours.accent }} />
          </div>
          <p
            className="mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={chip.overdue ? { background: "#FFECE9", color: "#B3261E" } : { background: colours.tint, color: "#3E4F59" }}
          >
            {chip.label}
          </p>
        </article>
      </ContextMenu.Trigger>
      <MenuBody project={project} Item={ContextMenu.Item} Sub={ContextMenu.Sub} SubTrigger={ContextMenu.SubTrigger} SubContent={ContextMenu.SubContent} Separator={ContextMenu.Separator} portal={ContextMenu.Portal} content={ContextMenu.Content} />
    </ContextMenu.Root>
  )
}

function MenuBody({
  project,
  Item,
  Sub,
  SubTrigger,
  SubContent,
  Separator,
  portal: Portal,
  content: Content,
}: {
  project: Project
  Item: typeof DropdownMenu.Item
  Sub: typeof DropdownMenu.Sub
  SubTrigger: typeof DropdownMenu.SubTrigger
  SubContent: typeof DropdownMenu.SubContent
  Separator: typeof DropdownMenu.Separator
  portal: typeof DropdownMenu.Portal
  content: typeof DropdownMenu.Content
}) {
  const commands = useCommands()
  return (
    <Portal>
      <Content className="z-[80] min-w-44 rounded-2xl border border-line bg-white p-1 text-[13px] shadow-lift">
        <Item className="rounded-xl px-3 py-1.5 outline-none data-[highlighted]:bg-surface-muted" onSelect={() => commands.ui.openProject(project.id)}>
          Open
        </Item>
        <Sub>
          <SubTrigger className="rounded-xl px-3 py-1.5 outline-none data-[highlighted]:bg-surface-muted">Change status</SubTrigger>
          <Portal>
            <SubContent className="z-[80] min-w-36 rounded-2xl border border-line bg-white p-1 shadow-lift">
              {STATUSES.map((status) => (
                <Item key={status} className="rounded-xl px-3 py-1.5 outline-none data-[highlighted]:bg-surface-muted" onSelect={() => void commands.setStatus(project.id, status)}>
                  {status}
                </Item>
              ))}
            </SubContent>
          </Portal>
        </Sub>
        <Sub>
          <SubTrigger className="rounded-xl px-3 py-1.5 outline-none data-[highlighted]:bg-surface-muted">Colour</SubTrigger>
          <Portal>
            <SubContent className="z-[80] min-w-36 rounded-2xl border border-line bg-white p-1 shadow-lift">
              {COLOURS.map((colour) => (
                <Item key={colour} className="rounded-xl px-3 py-1.5 outline-none data-[highlighted]:bg-surface-muted" onSelect={() => void commands.setColour(project.id, colour)}>
                  {colour}
                </Item>
              ))}
            </SubContent>
          </Portal>
        </Sub>
        <Item className="rounded-xl px-3 py-1.5 outline-none data-[highlighted]:bg-surface-muted" onSelect={() => void commands.pin(project, !project.pinned)}>
          {project.pinned ? "Unpin from Focus" : "Pin to Focus"}
        </Item>
        <Separator className="my-1 h-px bg-line" />
        <Item className="rounded-xl px-3 py-1.5 outline-none data-[highlighted]:bg-surface-muted" onSelect={() => commands.archive(project)}>
          Archive
        </Item>
      </Content>
    </Portal>
  )
}
