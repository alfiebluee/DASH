import { expect, test } from "@playwright/test"

import { signIn } from "./session"

test("live ops can look at the studio and cannot change it", async ({ page }) => {
  await signIn(page, "teddy@go-places.io")
  await page.goto("/studio")
  await expect(page.getByRole("heading", { name: "Stages" })).toBeVisible()
  await expect(page.getByText("You can look, not change.")).toBeVisible()
  await expect(page.getByRole("link", { name: "Shark Beauty" })).toBeVisible()
  await expect(page.getByRole("button", { name: "New" })).toHaveCount(0)

  await page.getByRole("link", { name: "Shark Beauty" }).click()
  await expect(page.getByRole("heading", { name: "Shark Beauty" })).toBeVisible()
  await expect(page.getByRole("button", { name: /Move to / })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Mark approved" })).toHaveCount(0)
  await page.getByRole("link", { name: "Documents" }).click()
  await expect(page.getByRole("button", { name: "Upload" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: /Delete / })).toHaveCount(0)
  await page.getByRole("link", { name: "Materials" }).click()
  await expect(page.getByRole("button", { name: "Import" })).toHaveCount(0)
  await page.getByRole("link", { name: "Budget" }).click()
  await expect(page.getByRole("button", { name: "Send budget for approval" })).toHaveCount(0)
})
