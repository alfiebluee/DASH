import { createSeed } from "./seed.ts"
import type { KeyValueStore, StudioRepository } from "./repo.ts"
import {
  databaseSchema,
  eventCreateSchema,
  eventPatchSchema,
  projectCreateSchema,
  projectPatchSchema,
  projectSchema,
  settingsSchema,
  studioEventSchema,
  type Database,
  type EventCreate,
  type EventPatch,
  type Project,
  type ProjectCreate,
  type ProjectPatch,
  type Settings,
  type SettingsPatch,
  type StudioEvent,
} from "./schemas.ts"

const STORAGE_KEY = "studio.v1"

function uid(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export class LocalAdapter implements StudioRepository {
  private readonly store: KeyValueStore
  private readonly now: () => Date

  constructor(store: KeyValueStore, now: () => Date = () => new Date()) {
    this.store = store
    this.now = now
  }

  async listProjects(): Promise<Project[]> {
    return structuredClone(this.read().projects)
  }

  async createProject(input: ProjectCreate): Promise<Project> {
    const parsed = projectCreateSchema.parse(input)
    const db = this.read()
    const stamp = new Date().toISOString()
    const project = projectSchema.parse({
      ...parsed,
      id: uid("prj"),
      createdAt: stamp,
      updatedAt: stamp,
    })
    this.write({ ...db, projects: [...db.projects, project] })
    return structuredClone(project)
  }

  async updateProject(id: string, patch: ProjectPatch): Promise<Project> {
    const parsed = projectPatchSchema.parse(patch)
    const db = this.read()
    const index = db.projects.findIndex((project) => project.id === id)
    const current = db.projects[index]
    if (!current) throw new Error(`No project with id ${id}`)
    const next = projectSchema.parse({
      ...current,
      ...parsed,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    })
    const projects = db.projects.slice()
    projects[index] = next
    this.write({ ...db, projects })
    return structuredClone(next)
  }

  async deleteProject(id: string): Promise<void> {
    const db = this.read()
    if (!db.projects.some((project) => project.id === id)) {
      throw new Error(`No project with id ${id}`)
    }
    this.write({
      ...db,
      projects: db.projects.filter((project) => project.id !== id),
      events: db.events.filter((event) => event.projectId !== id),
    })
  }

  async listEvents(): Promise<StudioEvent[]> {
    return structuredClone(this.read().events)
  }

  async createEvent(input: EventCreate): Promise<StudioEvent> {
    const parsed = eventCreateSchema.parse(input)
    const db = this.read()
    const event = studioEventSchema.parse({ ...parsed, id: uid("evt") })
    this.write({ ...db, events: [...db.events, event] })
    return structuredClone(event)
  }

  async updateEvent(id: string, patch: EventPatch): Promise<StudioEvent> {
    const parsed = eventPatchSchema.parse(patch)
    const db = this.read()
    const index = db.events.findIndex((event) => event.id === id)
    const current = db.events[index]
    if (!current) throw new Error(`No event with id ${id}`)
    const next = studioEventSchema.parse({ ...current, ...parsed, id: current.id })
    const events = db.events.slice()
    events[index] = next
    this.write({ ...db, events })
    return structuredClone(next)
  }

  async deleteEvent(id: string): Promise<void> {
    const db = this.read()
    if (!db.events.some((event) => event.id === id)) throw new Error(`No event with id ${id}`)
    this.write({ ...db, events: db.events.filter((event) => event.id !== id) })
  }

  async getSettings(): Promise<Settings> {
    return structuredClone(this.read().settings)
  }

  async updateSettings(patch: SettingsPatch): Promise<Settings> {
    const parsed = settingsSchema.partial().parse(patch)
    const db = this.read()
    const settings = settingsSchema.parse({ ...db.settings, ...parsed })
    this.write({ ...db, settings })
    return structuredClone(settings)
  }

  private read(): Database {
    const raw = this.store.getItem(STORAGE_KEY)
    if (!raw) return this.seed()
    try {
      const parsed = databaseSchema.safeParse(JSON.parse(raw))
      if (!parsed.success) return this.seed()
      return parsed.data
    } catch {
      return this.seed()
    }
  }

  private seed(): Database {
    const seeded = createSeed(this.now())
    this.write(seeded)
    return seeded
  }

  private write(db: Database): void {
    this.store.setItem(STORAGE_KEY, JSON.stringify(db))
  }
}
