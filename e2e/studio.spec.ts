import { expect, test } from "@playwright/test"

test("dashboard and manage show the same studio", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Alfie")
  await expect(page.getByRole("heading", { level: 2, name: "Parameter Marketing" })).toBeVisible()
  await expect(page.getByText("Go Places site visit").locator("visible=true")).toBeVisible()
  await page.getByRole("link", { name: "Manage" }).click()
  await expect(page.getByRole("heading", { level: 1 })).toContainText("in motion")
  await expect(page.getByText("Walk client through final review round").locator("visible=true")).toBeVisible()
  await page.getByRole("link", { name: "Dashboard" }).click()
  await expect(page.getByRole("heading", { level: 2, name: "Parameter Marketing" })).toBeVisible()
})

test("a project can be added, moved, rescheduled, archived, and restored", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "Add or find anything" }).click()
  await page.getByRole("option", { name: "New project" }).click()
  await page.getByRole("textbox", { name: "Name" }).fill("Trip")
  await page.getByRole("button", { name: "Create" }).click()
  await expect(page.getByRole("group", { name: "Trip" })).toBeVisible()

  await page.getByRole("group", { name: "Trip" }).focus()
  await page.keyboard.press("3")
  await expect(page.getByRole("region", { name: "Design" })).toContainText("Trip")

  const due = page.getByRole("button", { name: "Due date for Parameter Marketing" })
  const box = await due.boundingBox()
  if (!box) throw new Error("Missing due handle")
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2)
  await page.mouse.up()
  await expect(page.getByRole("button", { name: "Undo" })).toBeVisible()

  await page.getByRole("button", { name: "Actions for Taste Labs" }).click()
  await page.getByRole("menuitem", { name: "Archive" }).click()
  await expect(page.getByRole("group", { name: "Taste Labs" })).toHaveCount(0)

  await page.goto("/manage?tab=archive")
  await page.getByRole("button", { name: "Restore Taste Labs" }).click()
  await page.goto("/")
  await expect(page.getByRole("group", { name: "Taste Labs" })).toBeVisible()
})

test("every visible control has a name and an effect", async ({ page }) => {
  test.setTimeout(90_000)
  await page.addInitScript(() => {
    const shown = (element: Element) => {
      const style = getComputedStyle(element)
      const box = element.getBoundingClientRect()
      return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0
    }
    window.__studioControls = () =>
      [...document.querySelectorAll("button, a")].filter((element): element is HTMLElement => element instanceof HTMLElement && shown(element))
    window.__studioSignature = () => {
      const labels = [...document.querySelectorAll("button, a, [role='dialog'], [role='menu'], input, select, textarea")]
        .filter(shown)
        .map((element) => {
          const field = element as HTMLInputElement
          const state = field.checked ? "[x]" : element.getAttribute("aria-pressed") === "true" ? "[on]" : ""
          const name = element.getAttribute("aria-label") || element.textContent?.replace(/\s+/g, " ").trim() || ""
          return `${state}${name}`
        })
        .join("~")
      const hot = document.querySelectorAll("[data-highlighted='true']").length
      return `${location.pathname}${location.search}|${hot}|${labels}|${localStorage.getItem("studio.v1")}`
    }
  })
  const urls = ["/", "/manage?tab=projects", "/manage?tab=events", "/manage?tab=settings", "/manage?tab=archive"]
  for (const url of urls) {
    await page.goto(url)
    await page.getByRole("heading", { level: 1 }).waitFor()
    const seed = await page.evaluate(() => localStorage.getItem("studio.v1"))
    const expectedPath = new URL(url, page.url()).pathname
    const count = await page.evaluate(() => window.__studioControls().length)
    expect(count).toBeGreaterThan(0)
    for (let index = 0; index < count; index += 1) {
      const result = await page.evaluate(async (controlIndex) => {
        const controls = window.__studioControls()
        const element = controls[controlIndex]
        if (!element) return { missing: true as const }
        const name = (element.getAttribute("aria-label") || element.textContent || "").replace(/\s+/g, " ").trim()
        const skip =
          element.getAttribute("aria-current") === "page" ||
          element.getAttribute("aria-pressed") === "true" ||
          element.getAttribute("aria-selected") === "true" ||
          (element instanceof HTMLButtonElement && element.disabled)
        if (skip) return { name, skip: true, changed: true }
        const before = window.__studioSignature()
        const box = element.getBoundingClientRect()
        const pointer = {
          bubbles: true,
          cancelable: true,
          clientX: box.x + box.width / 2,
          clientY: box.y + box.height / 2,
          pointerId: 1,
          pointerType: "mouse",
        }
        const mouse = { bubbles: true, cancelable: true, button: 0, clientX: pointer.clientX, clientY: pointer.clientY }
        element.dispatchEvent(new PointerEvent("pointerdown", pointer))
        element.dispatchEvent(new MouseEvent("mousedown", mouse))
        element.dispatchEvent(new PointerEvent("pointerup", pointer))
        element.dispatchEvent(new MouseEvent("mouseup", mouse))
        element.click()
        const started = performance.now()
        let after = window.__studioSignature()
        while (after === before && performance.now() - started < 600) {
          await new Promise((resolve) => setTimeout(resolve, 20))
          after = window.__studioSignature()
        }
        return { name, skip: false, changed: after !== before }
      }, index)
      expect(result.missing, `${url} control ${index}`).toBeFalsy()
      expect(result.name?.length, `${url} control ${index}`).toBeGreaterThan(0)
      expect(result.changed, `${result.name} on ${url}`).toBe(true)
      await page.keyboard.press("Escape")
      const drifted = await page.evaluate(
        ({ stored, path, total }) =>
          localStorage.getItem("studio.v1") !== stored || location.pathname !== path || window.__studioControls().length !== total,
        { stored: seed, path: expectedPath, total: count },
      )
      if (drifted) {
        await page.evaluate((value) => {
          if (value) localStorage.setItem("studio.v1", value)
        }, seed)
        await page.goto(url)
        await page.getByRole("heading", { level: 1 }).waitFor()
      }
    }
  }
})

declare global {
  interface Window {
    __studioControls: () => HTMLElement[]
    __studioSignature: () => string
  }
}
