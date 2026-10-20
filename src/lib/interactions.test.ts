import { describe, expect, it } from "vitest"
import { createSeed } from "../data/seed.ts"
import { parseQuickAdd } from "./quick-add.ts"
import { planStageDrop } from "./stage-move.ts"

const today = new Date(2026, 9, 20, 12)

describe("stage moves", () => {
  it("promotes a pipeline idea into Brief", () => {
    const { projects } = createSeed(today)
    const changes = planStageDrop(projects, "idea:prj_taste", "lane:Brief")
    expect(changes?.find((change) => change.id === "prj_taste")).toMatchObject({ stage: "Brief" })
  })

  it("returns nothing when a card is dropped on itself", () => {
    const { projects } = createSeed(today)
    expect(planStageDrop(projects, "prj_parameter", "prj_parameter")).toBeNull()
  })
})

describe("quick add", () => {
  it("reads a launch and the project it belongs to", () => {
    const { projects } = createSeed(today)
    const parsed = parseQuickAdd("Ream launch 14 Nov", projects, today)
    expect(parsed).toMatchObject({ kind: "Launch", date: "2026-11-14", projectId: "prj_ream" })
  })

  it("reads a meeting on the coming Thursday", () => {
    const { projects } = createSeed(today)
    const parsed = parseQuickAdd("meeting Go Places Thursday 2pm", projects, today)
    expect(parsed).toMatchObject({ kind: "Meeting", date: "2026-10-22", projectId: "prj_goplaces" })
  })
})
