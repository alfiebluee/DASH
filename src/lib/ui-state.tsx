import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import type { EventCreate, Stage } from "../data/schemas.ts"

export type EventRequest =
  | { mode: "create"; draft: Partial<EventCreate> }
  | { mode: "edit"; id: string }

interface StudioUIValue {
  sessionFocusId: string | null
  setSessionFocusId: (id: string | null) => void
  projectRequest: { id: string } | { stage: Stage } | null
  openProject: (id: string) => void
  openNewProject: (stage?: Stage) => void
  closeProject: () => void
  eventRequest: EventRequest | null
  openEvent: (id: string) => void
  openNewEvent: (draft?: Partial<EventCreate>) => void
  closeEvent: () => void
  paletteOpen: boolean
  setPaletteOpen: (open: boolean) => void
  helpOpen: boolean
  setHelpOpen: (open: boolean) => void
  timelineUntil: string | null
  setTimelineUntil: (iso: string | null) => void
  highlightWeek: boolean
  flashDueThisWeek: () => void
}

const StudioUIContext = createContext<StudioUIValue | null>(null)

export function StudioUIProvider({ children }: { children: ReactNode }) {
  const [sessionFocusId, setSessionFocusId] = useState<string | null>(null)
  const [projectRequest, setProjectRequest] = useState<StudioUIValue["projectRequest"]>(null)
  const [eventRequest, setEventRequest] = useState<EventRequest | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [timelineUntil, setTimelineUntil] = useState<string | null>(null)
  const [highlightWeek, setHighlightWeek] = useState(false)

  const flashDueThisWeek = useCallback(() => {
    setHighlightWeek(true)
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    document.getElementById("timeline")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" })
    window.setTimeout(() => setHighlightWeek(false), 2000)
  }, [])

  const value = useMemo<StudioUIValue>(
    () => ({
      sessionFocusId,
      setSessionFocusId,
      projectRequest,
      openProject: (id) => setProjectRequest({ id }),
      openNewProject: (stage = "Brief") => setProjectRequest({ stage }),
      closeProject: () => setProjectRequest(null),
      eventRequest,
      openEvent: (id) => setEventRequest({ mode: "edit", id }),
      openNewEvent: (draft = {}) => setEventRequest({ mode: "create", draft }),
      closeEvent: () => setEventRequest(null),
      paletteOpen,
      setPaletteOpen,
      helpOpen,
      setHelpOpen,
      timelineUntil,
      setTimelineUntil,
      highlightWeek,
      flashDueThisWeek,
    }),
    [sessionFocusId, projectRequest, eventRequest, paletteOpen, helpOpen, timelineUntil, highlightWeek, flashDueThisWeek],
  )

  return <StudioUIContext.Provider value={value}>{children}</StudioUIContext.Provider>
}

export function useStudioUI(): StudioUIValue {
  const value = useContext(StudioUIContext)
  if (!value) throw new Error("Studio UI is missing its provider")
  return value
}
