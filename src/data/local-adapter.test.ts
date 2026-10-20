import { describe, expect, it } from "vitest"
import { applyOptimistic } from "./optimistic.ts"
import { LocalAdapter } from "./local-adapter.ts"
import type { KeyValueStore } from "./repo.ts"

function memoryStore(): KeyValueStore {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value)
    },
  }
}

const today = () => new Date(2026, 9, 20, 12)

describe("LocalAdapter", () => {
  it("seeds projects, events and settings on an empty store", async () => {
    const repo = new LocalAdapter(memoryStore(), today)
    const projects = await repo.listProjects()
    const events = await repo.listEvents()
    const settings = await repo.getSettings()
    expect(projects.map((project) => project.name)).toContain("Parameter Marketing")
    expect(events.map((event) => event.title)).toContain("Go Places site visit")
    expect(settings.greetingName).toBe("Alfie")
    expect(settings.timelineWeeks).toBe(6)
  })

  it("creates, updates and deletes a project, and removes its events", async () => {
    const repo = new LocalAdapter(memoryStore(), today)
    const created = await repo.createProject({
      name: "Trip",
      client: "Trip",
      description: "Design phase",
      type: "Web",
      stage: "Design",
      status: "On track",
      colour: "Sky",
      progress: 20,
      priority: 2,
      startDate: "2026-10-20",
      dueDate: "2026-11-20",
      hoursPerWeek: 4,
      nextAction: "Share the first direction",
      notes: "",
      links: [],
      sortOrder: 0,
      pinned: false,
      archived: false,
    })
    expect((await repo.listProjects()).some((project) => project.id === created.id)).toBe(true)

    const updated = await repo.updateProject(created.id, { stage: "Build", progress: 40 })
    expect(updated.stage).toBe("Build")
    expect(updated.progress).toBe(40)

    const event = await repo.createEvent({
      title: "Trip review",
      date: "2026-11-01",
      kind: "Meeting",
      projectId: created.id,
      source: "manual",
      done: false,
    })
    await repo.deleteProject(created.id)
    const projects = await repo.listProjects()
    const events = await repo.listEvents()
    expect(projects.some((project) => project.id === created.id)).toBe(false)
    expect(events.some((item) => item.id === event.id)).toBe(false)
  })

  it("rejects an invalid write and leaves the saved project unchanged", async () => {
    const repo = new LocalAdapter(memoryStore(), today)
    const [first] = await repo.listProjects()
    if (!first) throw new Error("expected a seeded project")
    await expect(repo.updateProject(first.id, { progress: 140 })).rejects.toThrow()
    const [after] = await repo.listProjects()
    expect(after?.progress).toBe(first.progress)
    expect(after?.stage).toBe(first.stage)
  })

  it("rolls an optimistic edit back to the previous value", () => {
    const current: { stage: "Brief" | "Build"; name: string } = { stage: "Brief", name: "Trip" }
    const result = applyOptimistic(current, (draft) => {
      draft.stage = "Build"
    })
    expect(result.next.stage).toBe("Build")
    expect(current.stage).toBe("Brief")
    expect(result.undo().stage).toBe("Brief")
  })
})
