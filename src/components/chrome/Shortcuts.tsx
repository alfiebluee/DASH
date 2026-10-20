import * as Dialog from "@radix-ui/react-dialog"
import { useEffect } from "react"
import { useCommands } from "../../lib/commands.ts"

const ROWS = [
  ["N", "New project"],
  ["E", "New date"],
  ["⌘K", "Command palette"],
  ["/", "Command palette"],
  ["?", "This list"],
  ["Esc", "Close"],
  ["1–6", "Move the focused project through the stages"],
  ["← →", "Shift a focused timeline edge by one day"],
]

export function Shortcuts() {
  const commands = useCommands()

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (isTyping(event.target)) return
      const key = event.key.toLowerCase()
      if ((event.metaKey || event.ctrlKey) && key === "k") {
        event.preventDefault()
        commands.ui.setPaletteOpen(true)
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (key === "n") commands.ui.openNewProject()
      if (key === "e") commands.ui.openNewEvent()
      if (key === "/") {
        event.preventDefault()
        commands.ui.setPaletteOpen(true)
      }
      if (key === "?") commands.ui.setHelpOpen(true)
      if (key === "g") return
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [commands])

  return (
    <Dialog.Root open={commands.ui.helpOpen} onOpenChange={commands.ui.setHelpOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-[#0F1C24]/20" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[90] w-[min(420px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-[28px] bg-white p-5 shadow-lift outline-none">
          <Dialog.Title className="text-[18px] font-medium tracking-tight">Shortcuts</Dialog.Title>
          <Dialog.Description className="mt-1 text-[13px] text-ink-3">These work from the dashboard and Manage.</Dialog.Description>
          <ul className="mt-4 space-y-2">
            {ROWS.map(([key, label]) => (
              <li key={key} className="flex items-center justify-between gap-4 text-[14px]">
                <span>{label}</span>
                <kbd className="rounded-md bg-surface-muted px-2 py-0.5 text-[12px] text-ink-2">{key}</kbd>
              </li>
            ))}
          </ul>
          <Dialog.Close className="mt-5 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white">Close</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable
}
