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
  test.setTimeout(300_000)
  await page.goto("/")
  await page.getByRole("heading", { level: 1 }).waitFor()
  const seed = await page.evaluate(() => localStorage.getItem("studio.v1"))
  const urls = ["/", "/manage?tab=projects", "/manage?tab=events", "/manage?tab=settings", "/manage?tab=archive"]
  for (const url of urls) {
    await page.goto(url)
    await page.getByRole("heading", { level: 1 }).waitFor()
    const count = await page.locator("button:visible, a:visible").count()
    for (let index = 0; index < count; index += 1) {
      await page.evaluate((value) => {
        if (value) localStorage.setItem("studio.v1", value)
      }, seed)
      await page.goto(url)
      await page.getByRole("heading", { level: 1 }).waitFor()
      await page.waitForTimeout(350)
      const control = page.locator("button:visible, a:visible").nth(index)
      const label = ((await control.getAttribute("aria-label")) || (await control.innerText()) || "").trim()
      expect(label.length, `${url} control ${index}`).toBeGreaterThan(0)
      const current = await control.getAttribute("aria-current")
      const pressed = await control.getAttribute("aria-pressed")
      const selected = await control.getAttribute("aria-selected")
      if (current === "page" || pressed === "true" || selected === "true") continue
      if (!(await control.isEnabled())) continue
      const before = await signature(page)
      await control.click()
      await expect.poll(async () => signature(page), { timeout: 1500, message: `${label} on ${url}` }).not.toBe(before)
      await page.keyboard.press("Escape")
    }
  }
})

function signature(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const shown = (element: Element) => {
      const style = getComputedStyle(element)
      const box = element.getBoundingClientRect()
      return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0
    }
    const labels = [...document.querySelectorAll("button, a, [role='dialog'], [role='menu'], input, select, textarea")]
      .filter(shown)
      .map((element) => element.getAttribute("aria-label") || element.textContent?.replace(/\s+/g, " ").trim() || "")
      .join("~")
    return `${location.pathname}${location.search}|${labels}|${localStorage.getItem("studio.v1")}`
  })
}
