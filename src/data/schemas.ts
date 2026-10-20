import { z } from "zod"

export const STAGES = ["Pipeline", "Brief", "Design", "Build", "Review", "Live"] as const
export const PROJECT_TYPES = ["Web", "Brand", "Paid Media", "Production", "Personal", "Other"] as const
export const STATUSES = ["On track", "At risk", "Blocked", "Paused"] as const
export const COLOURS = ["Lagoon", "Ocean", "Sky", "Indigo", "Mint", "Coral", "Amber", "Orchid"] as const
export const EVENT_KINDS = ["Deadline", "Meeting", "Launch", "Pitch", "Away", "Reminder"] as const
export const EVENT_SOURCES = ["manual", "calendar"] as const
export const TIMELINE_WEEKS = [4, 6, 8] as const

export const stageSchema = z.enum(STAGES)
export const projectTypeSchema = z.enum(PROJECT_TYPES)
export const statusSchema = z.enum(STATUSES)
export const colourSchema = z.enum(COLOURS)
export const eventKindSchema = z.enum(EVENT_KINDS)
export const eventSourceSchema = z.enum(EVENT_SOURCES)
export const timelineWeeksSchema = z.union([z.literal(4), z.literal(6), z.literal(8)])

export type Stage = z.infer<typeof stageSchema>
export type ProjectType = z.infer<typeof projectTypeSchema>
export type Status = z.infer<typeof statusSchema>
export type Colour = z.infer<typeof colourSchema>
export type EventKind = z.infer<typeof eventKindSchema>
export type EventSource = z.infer<typeof eventSourceSchema>
export type TimelineWeeks = z.infer<typeof timelineWeeksSchema>

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date")

export const linkSchema = z.object({
  label: z.string().min(1).max(60),
  url: z.url(),
})

export type Link = z.infer<typeof linkSchema>

export const projectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(60),
  client: z.string().max(80),
  description: z.string().max(80),
  type: projectTypeSchema,
  stage: stageSchema,
  status: statusSchema,
  colour: colourSchema,
  progress: z.number().int().min(0).max(100),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  startDate: isoDate.nullable(),
  dueDate: isoDate.nullable(),
  hoursPerWeek: z.number().min(0).max(80),
  nextAction: z.string().max(120),
  notes: z.string(),
  links: z.array(linkSchema),
  sortOrder: z.number(),
  pinned: z.boolean(),
  archived: z.boolean(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
})

export type Project = z.infer<typeof projectSchema>

export const projectCreateSchema = projectSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export const projectPatchSchema = projectCreateSchema.partial()

export type ProjectCreate = z.infer<typeof projectCreateSchema>
export type ProjectPatch = z.infer<typeof projectPatchSchema>

export const studioEventSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(120),
  date: isoDate,
  endDate: isoDate.optional(),
  kind: eventKindSchema,
  projectId: z.string().min(1).optional(),
  source: eventSourceSchema,
  done: z.boolean(),
})

export type StudioEvent = z.infer<typeof studioEventSchema>

export const eventCreateSchema = studioEventSchema.omit({ id: true })
export const eventPatchSchema = eventCreateSchema.partial()

export type EventCreate = z.infer<typeof eventCreateSchema>
export type EventPatch = z.infer<typeof eventPatchSchema>

const stageLabel = z.string().min(1).max(24)

export const settingsSchema = z.object({
  greetingName: z.string().min(1).max(40),
  weeklyCapacityHours: z.number().positive().max(168),
  stageLabels: z.tuple([stageLabel, stageLabel, stageLabel, stageLabel, stageLabel, stageLabel]),
  timelineWeeks: timelineWeeksSchema,
})

export type Settings = z.infer<typeof settingsSchema>
export type SettingsPatch = z.infer<ReturnType<typeof settingsSchema.partial>>

export const databaseSchema = z.object({
  projects: z.array(projectSchema),
  events: z.array(studioEventSchema),
  settings: settingsSchema,
})

export type Database = z.infer<typeof databaseSchema>

export function defaultSettings(): Settings {
  return {
    greetingName: "Alfie",
    weeklyCapacityHours: 40,
    stageLabels: ["Pipeline", "Brief", "Design", "Build", "Review", "Live"],
    timelineWeeks: 6,
  }
}
