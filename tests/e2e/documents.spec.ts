import { expect, test } from "@playwright/test"

import { adminClient, signIn } from "./session"

const ringClient = "11111111-1111-4111-8111-111111111111"

test("an owner can delete a document", async ({ page }) => {
  const admin = adminClient()
  const stamp = Date.now().toString()
  const scope = `PW scope ${stamp}`
  const upload = `PW upload ${stamp}`
  const project = await admin.from("projects").insert({
    client_id: ringClient,
    name: `PW docs ${stamp}`,
    type: "Set Design & Delivery",
    stage: "proposal",
    status: "ongoing",
  }).select("id").single()
  if (project.error || !project.data) throw project.error ?? new Error("No project")
  const loose = await admin.from("documents").insert({
    project_id: project.data.id,
    kind: "scope_of_work",
    title: scope,
    status: "approved",
  })
  if (loose.error) throw loose.error

  try {
    await signIn(page, "alfiebluee@gmail.com")
    await page.goto(`/studio/projects/${project.data.id}?tab=documents`)
    await expect(page.getByText(scope)).toBeVisible()
    page.once("dialog", (dialog) => dialog.accept())
    await page.getByRole("button", { name: `Delete ${scope} v1` }).click()
    await expect(page.getByText("Document deleted.")).toBeVisible()
    await expect(page.getByText(scope)).toHaveCount(0)

    await page.getByLabel("Title").fill(upload)
    await page.getByLabel("File").setInputFiles({
      name: "note.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.1\n"),
    })
    await page.getByRole("button", { name: "Upload" }).click()
    await expect(page.getByText("Added version 1.")).toBeVisible()
    page.once("dialog", (dialog) => dialog.accept())
    await page.getByRole("button", { name: `Delete ${upload} v1` }).click()
    await expect(page.getByText("Document deleted.")).toBeVisible()
    await expect(page.getByRole("button", { name: `Delete ${upload} v1` })).toHaveCount(0)
  } finally {
    await admin.from("projects").delete().eq("id", project.data.id)
  }
})
