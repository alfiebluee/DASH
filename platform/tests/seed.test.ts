import { readFileSync } from "node:fs"

import { expect, it } from "vitest"

import { staff } from "../lib/staff"

const seed = readFileSync("supabase/seed.sql", "utf8")

it("seeds the four named projects and the staff owners", () => {
  const lowered = seed.toLowerCase()
  for (const person of staff) {
    expect(lowered).toContain(`'${person.email}', '${person.full_name.toLowerCase()}'`)
  }
  expect(seed).not.toMatch(/Riley@/)
  for (const name of ["Ring", "Shark Beauty", "Shark Home", "Shark Ninja"]) {
    expect(seed).toContain(`'${name}'`)
  }
  expect(seed).not.toContain("Baeuty")
  expect(seed).not.toContain("Shark Kitchen")
  expect(seed).not.toContain("Butternut")
  expect(seed).not.toContain("Go Places")
  expect(seed).not.toContain("Parameter")
  expect(seed).toContain("'design'")
  expect(seed).toContain("'2026-11-13'")
  expect(seed).toContain("'brief'")
  expect(seed).toContain("'ongoing'")
})
