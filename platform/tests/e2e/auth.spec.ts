import { expect, test } from "@playwright/test"

test("signed-out visits land on the login page", async ({ page }) => {
  await page.goto("/studio")
  await expect(page).toHaveURL(/\/login$/)
  await page.goto("/portal")
  await expect(page).toHaveURL(/\/login$/)
  await page.goto("/studio/projects")
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible()
  await expect(page.getByLabel("Password")).toHaveCount(0)
})

test("an unknown email does not open the studio", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel("Email").fill("stranger@example.com")
  await page.getByRole("button", { name: "Continue" }).click()
  await expect(page.locator("p[role=alert]")).toContainText(/isn't invited|not running/i)
  await expect(page).toHaveURL(/\/login\?error=/)
  await page.goto("/studio")
  await expect(page).toHaveURL(/\/login$/)
})

test("the login page fits a phone width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/login")
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
  expect(overflow).toBe(false)
})
