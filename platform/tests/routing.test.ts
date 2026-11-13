import { describe, expect, it } from "vitest"

import { redirectFor } from "../lib/routing"

describe("redirectFor", () => {
  it("sends signed-out people to login", () => {
    expect(redirectFor("/studio", null)).toBe("/login")
    expect(redirectFor("/portal", null)).toBe("/login")
    expect(redirectFor("/", null)).toBe("/login")
    expect(redirectFor("/login", null)).toBeNull()
  })

  it("keeps the owner in the studio and the client in the portal", () => {
    expect(redirectFor("/login", "owner")).toBe("/studio")
    expect(redirectFor("/portal", "owner")).toBe("/studio")
    expect(redirectFor("/studio", "owner")).toBeNull()
    expect(redirectFor("/studio/settings", "client")).toBe("/portal")
    expect(redirectFor("/portal", "client")).toBeNull()
    expect(redirectFor("/login", "client")).toBe("/portal")
  })
})
