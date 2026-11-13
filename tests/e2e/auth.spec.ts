import { expect, test } from "@playwright/test"

import { adminClient } from "./session"

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

test("a wrong code stays on the code step", async ({ page }) => {
  await page.goto("/login?code=1&email=alfie%40asiya.space")
  await expect(page.getByLabel("Code")).toBeVisible()
  await page.getByLabel("Code").fill("000000")
  await page.getByRole("button", { name: "Continue" }).click()
  await expect(page.locator("p[role=alert]")).toContainText(/not right/i)
  await expect(page).toHaveURL(/error=code/)
})

test("the code from the email signs an owner in", async ({ page }) => {
  const email = "alfie@asiya.space"
  const link = await adminClient().auth.admin.generateLink({ type: "magiclink", email })
  const otp = link.data.properties?.email_otp
  expect(link.error).toBeNull()
  expect(otp).toMatch(/^\d{6,8}$/)
  await page.goto(`/login?code=1&email=${encodeURIComponent(email)}`)
  await page.getByLabel("Code").fill(otp!)
  await page.getByRole("button", { name: "Continue" }).click()
  await expect(page).toHaveURL(/\/studio/, { timeout: 20_000 })
})

test("the login page fits a phone width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/login")
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
  expect(overflow).toBe(false)
})
