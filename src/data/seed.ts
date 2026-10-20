import type { Database, Project, Settings, StudioEvent } from "./schemas.ts"
import { databaseSchema, defaultSettings } from "./schemas.ts"
import { isoOffset } from "../lib/dates.ts"

const milestonePhrases: Record<string, string> = {
  prj_parameter: "Hand-off",
  prj_huglin: "Campaigns live",
  prj_goplaces: "Design sign-off",
  prj_alcera: "Proposal due",
  prj_nonoise: "Beta ready",
  prj_bweb: "New site",
}

const duePresentation: Record<string, { title: string; detail: string }> = {
  prj_huglin: { title: "Huglin campaigns live", detail: "Launch" },
  prj_goplaces: { title: "Go Places design sign-off", detail: "Deadline" },
  prj_alcera: { title: "Alcera proposal due", detail: "Deadline" },
  prj_nonoise: { title: "Beta ready", detail: "Deadline" },
  prj_bweb: { title: "New site", detail: "Deadline" },
  prj_parameter: { title: "Parameter hand-off", detail: "Launch" },
}

export function milestonePhrase(project: Project): string {
  return milestonePhrases[project.id] ?? project.name
}

export function duePresentationFor(project: Project): { title: string; detail: string } {
  return duePresentation[project.id] ?? { title: project.name, detail: "Deadline" }
}

function awayRange(today: Date): { date: string; endDate: string } {
  let year = today.getFullYear()
  const december = new Date(year, 11, 14)
  if (today > december) year += 1
  const start = new Date(year, 11, 14)
  const end = new Date(year + 1, 0, 18)
  const pad = (value: number) => String(value).padStart(2, "0")
  return {
    date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    endDate: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
  }
}

export function createSeed(today: Date): Database {
  const stamp = new Date(today).toISOString()
  const on = (days: number) => isoOffset(today, days)
  const settings: Settings = defaultSettings()

  const base = {
    notes: "",
    links: [] as Project["links"],
    pinned: false,
    archived: false,
    createdAt: stamp,
    updatedAt: stamp,
  }

  const projects: Project[] = [
    {
      ...base,
      id: "prj_parameter",
      name: "Parameter Marketing",
      client: "Parameter",
      description: "Website build",
      type: "Web",
      stage: "Review",
      status: "On track",
      colour: "Indigo",
      progress: 85,
      priority: 1,
      startDate: on(-40),
      dueDate: on(9),
      hoursPerWeek: 6,
      nextAction: "Walk client through final review round",
      notes: "Final review covers the homepage, case studies, and the contact flow.",
      sortOrder: 0,
    },
    {
      ...base,
      id: "prj_huglin",
      name: "Huglin Carpets",
      client: "Huglin Carpets",
      description: "Google Ads and social",
      type: "Paid Media",
      stage: "Build",
      status: "On track",
      colour: "Mint",
      progress: 64,
      priority: 2,
      startDate: on(2),
      dueDate: on(14),
      hoursPerWeek: 6,
      nextAction: "Finish ad group restructure",
      notes: "Search structure is in progress. Social still needs the new offer lines.",
      sortOrder: 0,
    },
    {
      ...base,
      id: "prj_goplaces",
      name: "Go Places",
      client: "Go Places",
      description: "Studio rigging build",
      type: "Production",
      stage: "Design",
      status: "At risk",
      colour: "Coral",
      progress: 42,
      priority: 1,
      startDate: on(1),
      dueDate: on(17),
      hoursPerWeek: 7,
      nextAction: "Lock studio layout options",
      notes: "Layout options are still open, which is holding the sign-off.",
      sortOrder: 0,
    },
    {
      ...base,
      id: "prj_alcera",
      name: "Alcera Tiles",
      client: "Alcera",
      description: "Paid media proposal",
      type: "Paid Media",
      stage: "Brief",
      status: "On track",
      colour: "Amber",
      progress: 18,
      priority: 2,
      startDate: on(13),
      dueDate: on(24),
      hoursPerWeek: 4,
      nextAction: "Draft channel split",
      notes: "Proposal needs a channel split before it can go to the client.",
      sortOrder: 0,
    },
    {
      ...base,
      id: "prj_nonoise",
      name: "No Noise",
      client: "Personal",
      description: "Job-market platform",
      type: "Personal",
      stage: "Build",
      status: "On track",
      colour: "Lagoon",
      progress: 58,
      priority: 2,
      startDate: on(20),
      dueDate: on(38),
      hoursPerWeek: 5,
      nextAction: "Ship onboarding flow",
      notes: "Onboarding is the next slice. The job board can wait.",
      sortOrder: 1,
    },
    {
      ...base,
      id: "prj_bweb",
      name: "BWeb",
      client: "Personal",
      description: "Studio brand and site",
      type: "Personal",
      stage: "Design",
      status: "Paused",
      colour: "Sky",
      progress: 30,
      priority: 2,
      startDate: on(13),
      dueDate: on(41),
      hoursPerWeek: 4,
      nextAction: "Pick a wordmark direction",
      notes: "Paused until the wordmark direction is chosen.",
      sortOrder: 1,
    },
    {
      ...base,
      id: "prj_taste",
      name: "Taste Labs",
      client: "Taste Labs",
      description: "Brand systems",
      type: "Brand",
      stage: "Pipeline",
      status: "On track",
      colour: "Orchid",
      progress: 8,
      priority: 2,
      startDate: null,
      dueDate: null,
      hoursPerWeek: 2,
      nextAction: "Prep portfolio for intro call",
      notes: "Intro call is booked. Portfolio still needs a tighter edit.",
      sortOrder: 0,
    },
    {
      ...base,
      id: "prj_ream",
      name: "Ream Interiors",
      client: "Ream",
      description: "Website and marketing",
      type: "Web",
      stage: "Live",
      status: "On track",
      colour: "Ocean",
      progress: 100,
      priority: 3,
      startDate: null,
      dueDate: null,
      hoursPerWeek: 4,
      nextAction: "Monthly performance check-in",
      notes: "Retainer. Check performance once a month.",
      sortOrder: 0,
    },
  ]

  const away = awayRange(today)
  const events: StudioEvent[] = [
    {
      id: "evt_visit",
      title: "Go Places site visit",
      date: on(2),
      kind: "Meeting",
      projectId: "prj_goplaces",
      source: "manual",
      done: false,
    },
    {
      id: "evt_report",
      title: "Huglin monthly ads report",
      date: on(4),
      kind: "Deadline",
      projectId: "prj_huglin",
      source: "manual",
      done: false,
    },
    {
      id: "evt_handoff",
      title: "Parameter hand-off",
      date: on(9),
      kind: "Launch",
      projectId: "prj_parameter",
      source: "manual",
      done: false,
    },
    {
      id: "evt_intro",
      title: "Intro call",
      date: on(29),
      kind: "Pitch",
      projectId: "prj_taste",
      source: "manual",
      done: false,
    },
    {
      id: "evt_away",
      title: "Away",
      date: away.date,
      endDate: away.endDate,
      kind: "Away",
      source: "manual",
      done: false,
    },
  ]

  return databaseSchema.parse({ projects, events, settings })
}
