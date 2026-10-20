import { describe, expect, it } from "vitest"
import { createSeed } from "../data/seed.ts"
import { upNext } from "./agenda.ts"
import { atRiskCount, capacityFor, dueThisWeekCount } from "./capacity.ts"
import { deadlineReadout, selectFocus } from "./focus.ts"
import { buildTimeline, clipSpan, timelineWindow } from "./timeline.ts"

const today = new Date(2026, 9, 20, 18)

describe("focus selection", () => {
  it("chooses the most urgent active project when nothing is pinned", () => {
    const { projects } = createSeed(today)
    expect(selectFocus(projects)?.name).toBe("Parameter Marketing")
    expect(deadlineReadout(selectFocus(projects)!, today)).toMatchObject({
      figure: "9",
      caption: "days to the next deadline · 29 Oct",
    })
  })

  it("prefers a pinned project, then a session selection", () => {
    const { projects } = createSeed(today)
    const pinned = projects.map((project) =>
      project.id === "prj_taste" ? { ...project, pinned: true } : project,
    )
    expect(selectFocus(pinned)?.id).toBe("prj_taste")
    expect(selectFocus(projects, "prj_goplaces")?.name).toBe("Go Places")
  })

  it("ignores pipeline, live and archived projects when choosing urgency", () => {
    const { projects } = createSeed(today)
    const onlyQuiet = projects.filter((project) => project.stage === "Pipeline" || project.stage === "Live")
    expect(selectFocus(onlyQuiet)).toBeNull()
  })
})

describe("capacity", () => {
  it("sums active hours against the weekly capacity", () => {
    const { projects, events, settings } = createSeed(today)
    expect(capacityFor(projects, settings.weeklyCapacityHours)).toMatchObject({
      used: 32,
      weekly: 40,
      tone: "turquoise",
      active: 6,
    })
    expect(atRiskCount(projects)).toBe(1)
    expect(dueThisWeekCount(projects, events, today)).toBe(2)
    expect(capacityFor(projects, 30).tone).toBe("coral")
    expect(capacityFor([{ ...projects[0]!, hoursPerWeek: 34 }], 40).tone).toBe("amber")
  })
})

describe("timeline clipping", () => {
  it("starts weeks on Monday and clips bars that begin before the window", () => {
    const window = timelineWindow(today, 6)
    expect(window.columns).toHaveLength(6)
    expect(window.columns[0]?.toDateString()).toContain("Oct 19")
    const clipped = clipSpan("2026-09-10", "2026-10-29", window.windowStart, window.totalDays)
    expect(clipped?.clippedLeft).toBe(true)
    expect(clipped?.left).toBe(0)
    expect(clipped?.width).toBeGreaterThan(0.2)
    expect(clipSpan("2026-12-01", "2026-12-20", window.windowStart, window.totalDays)).toBeNull()
  })

  it("keeps Taste Labs as a marker row and Parameter clipped on the left", () => {
    const { projects, events } = createSeed(today)
    const model = buildTimeline(projects, events, today, 6)
    const names = model.rows.map((row) => row.project.name)
    expect(names).toContain("Parameter Marketing")
    expect(names).toContain("Taste Labs")
    expect(names).not.toContain("Ream Interiors")
    expect(model.rows.find((row) => row.project.id === "prj_parameter")?.bar?.clippedLeft).toBe(true)
    expect(model.offscreen?.label).toBe("Away from 14 Dec")
  })
})

describe("up next", () => {
  it("merges events and project dues without duplicating a launch on the due date", () => {
    const { projects, events } = createSeed(today)
    expect(upNext(projects, events, today).map((item) => item.title)).toEqual([
      "Go Places site visit",
      "Huglin monthly ads report",
      "Parameter hand-off",
      "Huglin campaigns live",
      "Go Places design sign-off",
      "Alcera proposal due",
    ])
  })
})
