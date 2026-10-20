import type { EventCreate, EventPatch, Project, ProjectCreate, ProjectPatch, Settings, SettingsPatch, StudioEvent } from "./schemas.ts"

export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface StudioRepository {
  listProjects(): Promise<Project[]>
  createProject(input: ProjectCreate): Promise<Project>
  updateProject(id: string, patch: ProjectPatch): Promise<Project>
  deleteProject(id: string): Promise<void>
  listEvents(): Promise<StudioEvent[]>
  createEvent(input: EventCreate): Promise<StudioEvent>
  updateEvent(id: string, patch: EventPatch): Promise<StudioEvent>
  deleteEvent(id: string): Promise<void>
  getSettings(): Promise<Settings>
  updateSettings(patch: SettingsPatch): Promise<Settings>
}
