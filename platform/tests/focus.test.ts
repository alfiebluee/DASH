import { expect, it } from "vitest"

import { diffDays } from "../lib/dates"
import { selectFocus } from "../lib/focus"
import type { ProjectCard } from "../lib/records"

const today = "2026-11-12"

function project(partial: Pick<ProjectCard, "id" | "name" | "stage" | "status" | "due_date"> & Partial<ProjectCard>): ProjectCard {
  return {
    type: "Set Design & Delivery",
    start_date: null,
    pinned: false,
    description: "",
    client_id: "client",
    client_name: partial.name === "Ring" ? "Ring" : "Shark Ninja",
    updated_at: "2026-11-12T00:00:00Z",
    ...partial,
  }
}

const projects = [
  project({ id: "ring", name: "Ring", stage: "design", status: "active", due_date: "2026-11-13" }),
  project({ id: "beauty", name: "Shark Beauty", stage: "brief", status: "ongoing", due_date: null }),
  project({ id: "home", name: "Shark Home", stage: "brief", status: "ongoing", due_date: null }),
  project({ id: "ninja", name: "Shark Ninja", stage: "brief", status: "ongoing", due_date: null }),
]

it("focuses the dated Ring project unless a card or pin says otherwise", () => {
  expect(diffDays("2026-11-13", today)).toBe(1)
  expect(selectFocus(projects, today)?.name).toBe("Ring")
  expect(selectFocus(projects, today, "beauty")?.name).toBe("Shark Beauty")
  const pinned = projects.map((item) => (item.id === "home" ? { ...item, pinned: true } : item))
  expect(selectFocus(pinned, today)?.name).toBe("Shark Home")
})
