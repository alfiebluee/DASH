import { Command } from "cmdk"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { TIMELINE_WEEKS } from "../../data/schemas.ts"
import { useCommands } from "../../lib/commands.ts"
import { parseQuickAdd } from "../../lib/quick-add.ts"

export function CommandPalette() {
  const commands = useCommands()
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const now = new Date()
  const preview = parseQuickAdd(query, commands.projects, now)
  const open = commands.ui.paletteOpen

  function close() {
    commands.ui.setPaletteOpen(false)
    setQuery("")
  }

  function go(path: string) {
    navigate(path)
    close()
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={(next) => {
        commands.ui.setPaletteOpen(next)
        if (!next) setQuery("")
      }}
      label="Add or find anything"
      shouldFilter={!preview}
    >
      <Command.Input value={query} onValueChange={setQuery} placeholder="Add or find anything" />
      <Command.List>
        <Command.Empty>Nothing matches that.</Command.Empty>
        {preview ? (
          <Command.Group heading="Add">
            <Command.Item
              value={preview.line}
              onSelect={() => {
                void commands.mutations.createEvent
                  .mutateAsync({
                    title: preview.title,
                    date: preview.date,
                    kind: preview.kind,
                    projectId: preview.projectId,
                    source: "manual",
                    done: false,
                  })
                  .then(() => close())
              }}
            >
              {preview.line}
            </Command.Item>
          </Command.Group>
        ) : null}
        <Command.Group heading="Actions">
          <Command.Item onSelect={() => { close(); commands.ui.openNewProject() }}>New project</Command.Item>
          <Command.Item onSelect={() => { close(); commands.ui.openNewEvent() }}>New event</Command.Item>
          <Command.Item onSelect={() => go("/manage?tab=projects")}>Go to Manage</Command.Item>
          <Command.Item onSelect={() => go("/manage?tab=settings")}>Open Settings</Command.Item>
          {TIMELINE_WEEKS.map((weeks) => (
            <Command.Item
              key={weeks}
              onSelect={() => {
                void commands.mutations.updateSettings.mutateAsync({ timelineWeeks: weeks }).then(() => close())
              }}
            >
              Show {weeks} weeks
            </Command.Item>
          ))}
        </Command.Group>
        <Command.Group heading="Projects">
          {commands.projects.filter((project) => !project.archived).map((project) => (
            <Command.Item key={project.id} value={project.name} onSelect={() => { close(); commands.ui.openProject(project.id) }}>
              {project.name}
            </Command.Item>
          ))}
        </Command.Group>
        <Command.Group heading="Events">
          {commands.events.filter((event) => !event.done).map((event) => (
            <Command.Item key={event.id} value={event.title} onSelect={() => { close(); commands.ui.openEvent(event.id) }}>
              {event.title}
            </Command.Item>
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  )
}
