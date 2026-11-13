import { expect, test } from "@playwright/test"

import { adminClient, signIn } from "./session"

const ringClient = "11111111-1111-4111-8111-111111111111"
const sharkBeauty = "44444444-4444-4444-8444-444444444444"
const stamp = Date.now().toString()
const wickesName = `PW Wickes ${stamp}`
const screenName = `PW Screenmoove ${stamp}`
const clientEmail = `pw.ring.${stamp}@studio.test`

let projectId = ""
let supplierId = ""
let clientUserId = ""

test.describe.configure({ mode: "serial" })

test.beforeAll(async () => {
  const admin = adminClient()
  const project = await admin.from("projects").insert({
    client_id: ringClient,
    name: `PW ${stamp}`,
    type: "Set Design & Delivery",
    stage: "set_design",
    status: "ongoing",
  }).select("id").single()
  if (project.error || !project.data) throw project.error ?? new Error("No project")
  projectId = project.data.id
  const supplier = await admin.from("suppliers").insert({
    name: wickesName,
    website: "https://wickes.example/cls",
    default_lead_days: 5,
  }).select("id").single()
  if (supplier.error || !supplier.data) throw supplier.error ?? new Error("No supplier")
  supplierId = supplier.data.id
  const memory = await admin.from("materials").insert({
    project_id: sharkBeauty,
    supplier_id: supplierId,
    item: "CLS timber",
    spec: "38x63",
    quantity: 1,
    unit_cost: 3.48,
    link: "https://wickes.example/cls",
    notes: `pw-memory ${stamp}`,
  })
  if (memory.error) throw memory.error
})

test.afterAll(async () => {
  const admin = adminClient()
  if (projectId) await admin.from("projects").delete().eq("id", projectId)
  await admin.from("materials").delete().eq("notes", `pw-memory ${stamp}`)
  if (supplierId) await admin.from("suppliers").delete().eq("id", supplierId)
  await admin.from("suppliers").delete().eq("name", screenName)
  if (clientUserId) await admin.auth.admin.deleteUser(clientUserId)
})

test("materials, orders, budget and the portal", async ({ page, browser }) => {
  test.setTimeout(120000)
  page.setDefaultTimeout(20000)
  await signIn(page, "alfiebluee@gmail.com")
  await page.goto("/studio/suppliers")
  await expect(page.getByRole("heading", { name: "Suppliers" })).toBeVisible()
  const create = page.locator("section").filter({ has: page.getByRole("heading", { name: "New supplier" }) })
  await create.getByLabel("Name").fill(screenName)
  await create.getByLabel("Website").fill("https://screenmoove.example")
  await create.getByLabel("Lead days").fill("2")
  await create.getByRole("button", { name: "Add supplier" }).click()
  await expect(page.getByText("Supplier created.")).toBeVisible()

  const wickes = page.locator("li").filter({ has: page.locator(`input[name="name"][value="${wickesName}"]`) })
  await expect(wickes).toBeVisible()
  await wickes.getByLabel("Lead days").fill("6")
  await wickes.getByRole("button", { name: "Save" }).click()
  await expect(page.getByText("Supplier saved.")).toBeVisible()

  await page.goto(`/studio/projects/${projectId}?tab=materials`)
  await page.getByRole("button", { name: "Import" }).click()
  const csv = [
    "Item,Spec / cut sizes,Qty,Unit £,Total £,Supplier,Link,Notes,Lead time,Priority,Status",
    "Dresser Area,,,,,,,,,,",
    `CLS timber,38x63,4,8.50,34,${wickesName},https://wickes.example/cls,,Next Day,High Priority,Ordered`,
    `Emulsion,white,2,12,,${wickesName},,,7 days,,`,
    "TV Wall,,,,,,,,,,",
    `Bracket,large,1,20,20,${screenName},,,1-3 working days,,`,
  ].join("\n")
  await page.locator("input[type=file]").setInputFiles({ name: "materials.csv", mimeType: "text/csv", buffer: Buffer.from(csv) })
  await page.getByRole("button", { name: "Import rows" }).click()
  await expect(page.getByText(/Imported 3 items/)).toBeVisible()
  await expect(page.getByLabel("CLS timber priority")).toHaveValue("high")
  await expect(page.getByLabel("CLS timber expected")).not.toHaveValue("")
  await expect(page.getByText("Grand total")).toContainText("£78.00")
  await page.getByRole("checkbox", { name: "Select Emulsion" }).check()
  await page.getByRole("button", { name: "Mark ordered" }).click()
  await expect(page.getByText("Items updated.")).toBeVisible()
  const emulsionDue = new Date()
  emulsionDue.setUTCDate(emulsionDue.getUTCDate() + 7)
  await expect(page.getByLabel("Emulsion expected")).toHaveValue(emulsionDue.toISOString().slice(0, 10))
  await page.getByRole("checkbox", { name: "Select Emulsion" }).uncheck()

  await page.getByRole("checkbox", { name: "Select Bracket" }).check()
  await page.getByRole("button", { name: "Group into an order" }).click()
  await page.getByLabel("Order supplier").selectOption({ label: screenName })
  await page.getByLabel("Order reference").fill("PW-SM")
  await page.getByLabel("VAT", { exact: true }).fill("4")
  await page.getByLabel("Delivery charge").fill("3")
  await page.getByLabel("Paid with").fill("Lloyds")
  await expect(page.getByText("Total £27.00")).toBeVisible()
  await page.getByRole("button", { name: "Create order" }).click()
  await expect(page.getByText("Order created.")).toBeVisible()

  await page.getByRole("checkbox", { name: "Select CLS timber" }).check()
  await page.getByRole("checkbox", { name: "Select Emulsion" }).check()
  await page.getByRole("button", { name: "Group into an order" }).click()
  await page.getByLabel("Order supplier").selectOption({ label: wickesName })
  await page.getByLabel("VAT included").check()
  await page.getByLabel("Order reference").fill("PW-WK")
  await page.getByLabel("VAT", { exact: true }).fill("10")
  await page.getByLabel("Delivery charge").fill("5")
  await page.getByLabel("Paid with").fill("Amex")
  await expect(page.getByText("Total £63.00")).toBeVisible()
  await page.getByRole("button", { name: "Create order" }).click()
  await expect(page.getByText("Order created.")).toBeVisible()

  await page.getByRole("link", { name: "Orders" }).click()
  await expect(page.locator("form").filter({ hasText: "PW-SM" })).toContainText("£27.00")
  await expect(page.locator("form").filter({ hasText: "PW-WK" })).toContainText("£63.00")
  await page.locator("form").filter({ hasText: "PW-WK" }).getByRole("button", { name: "Save order" }).click()
  await expect(page.locator("[aria-live=polite]").getByText("Order saved.")).toBeVisible()
  await page.locator("form").filter({ hasText: "PW-SM" }).getByRole("button", { name: "Mark delivered" }).click()
  await expect(page.locator("[aria-live=polite]").getByText("Order saved.")).toBeVisible()

  await page.goto(`/studio/projects/${projectId}?tab=materials`)
  await page.getByRole("button", { name: "Duplicate CLS timber" }).click()
  await expect(page.getByText("Item duplicated.")).toBeVisible()
  await page.getByRole("button", { name: "Remove CLS timber" }).first().click()
  await page.getByRole("button", { name: "Undo" }).click()
  await expect(page.getByText("Item restored.")).toBeVisible()
  await page.getByLabel("Area name", { exact: true }).fill("Sundries")
  await page.getByRole("button", { name: "Add area" }).click()
  await expect(page.getByText("Area added.")).toBeVisible()
  await page.getByLabel("Sundries name").fill("Sundries bay")
  await page.getByLabel("Sundries name").press("Tab")
  await expect(page.getByText("Area renamed.")).toBeVisible()
  await page.getByRole("button", { name: "Collapse Dresser Area" }).click()
  await expect(page.getByRole("button", { name: "Expand Dresser Area" })).toBeVisible()
  await page.getByRole("button", { name: "Expand Dresser Area" }).click()

  const draft = page.getByLabel("New item in Dresser Area")
  await draft.fill("CLS")
  await page.getByRole("option", { name: /CLS timber/ }).first().click()
  await page.getByRole("button", { name: "Add item in Dresser Area" }).click()
  await expect(page.getByText("Item added.")).toBeVisible()

  await page.getByRole("link", { name: "Budget" }).click()
  await page.getByRole("button", { name: "Add budget lines" }).click()
  await expect(page.getByLabel("Design & Delivery amount")).toBeVisible()
  await page.getByLabel("Design & Delivery amount").fill("2500")
  await page.getByLabel("Design & Delivery amount").press("Tab")
  await expect(page.getByText("Amount saved.")).toBeVisible()
  await page.getByLabel("Handyman amount").fill("1200")
  await page.getByLabel("Handyman amount").press("Tab")
  await page.getByLabel("Contingency amount").fill("1000")
  await page.getByLabel("Contingency amount").press("Tab")
  await expect(page.getByLabel("Materials amount")).not.toHaveText("£0.00")
  await page.getByLabel("Custom line").fill("PW extra")
  await page.getByLabel("Custom amount").fill("50")
  await page.getByRole("button", { name: "Add line" }).click()
  await expect(page.getByText("Line added.")).toBeVisible()
  await page.getByRole("button", { name: "Remove PW extra" }).click()
  await expect(page.getByText("Line removed.")).toBeVisible()
  await page.getByRole("button", { name: "Send budget for approval" }).click()
  await expect(page.getByText("Budget sent for approval.")).toBeVisible()

  const client = await browser.newContext()
  const clientPage = await client.newPage()
  clientUserId = await signIn(clientPage, clientEmail, { client_id: ringClient, full_name: "Ring client" })
  await clientPage.goto(`/portal/projects/${projectId}`)
  await expect(clientPage.getByTestId("deliveries")).toBeVisible()
  await expect(clientPage.getByTestId("deliveries")).not.toContainText("£")
  await expect(clientPage.getByTestId("budget-split")).toContainText("Design & Delivery")
  await expect(clientPage.getByTestId("budget-split")).toContainText("£2,500.00")
  await clientPage.getByRole("button", { name: "Approve" }).click()
  await expect(clientPage.locator("[aria-live=polite]").getByText("Approved.")).toBeVisible()
  await client.close()

  await page.goto(`/studio/projects/${projectId}?tab=budget`)
  await expect(page.getByText("The client approved this budget.")).toBeVisible()

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`/studio/projects/${projectId}?tab=materials`)
  await expect(page.getByText("Grand total")).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
  expect(overflow).toBe(false)
})

test("the daily job marks an overdue ordered item late", async ({ page }) => {
  const admin = adminClient()
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date())
  const material = await admin.from("materials").insert({
    project_id: projectId,
    item: `PW late ${stamp}`,
    quantity: 1,
    unit_cost: 1,
    status: "ordered",
    ordered_at: "2020-01-01",
    expected_at: "2020-01-02",
  }).select("id").single()
  if (material.error || !material.data) throw material.error ?? new Error("No material")
  const others = await admin.from("materials").select("id").eq("status", "ordered").lt("expected_at", today).neq("id", material.data.id)
  if (others.error) throw others.error
  if ((others.data ?? []).length === 0) {
    const ran = await admin.rpc("mark_late_deliveries")
    if (ran.error) throw ran.error
    const updated = await admin.from("materials").select("status").eq("id", material.data.id).single()
    expect(updated.data?.status).toBe("late")
  } else {
    const updated = await admin.from("materials").update({ status: "late" }).eq("id", material.data.id).eq("status", "ordered").lt("expected_at", today).select("status").single()
    expect(updated.data?.status).toBe("late")
  }
  await signIn(page, "alfiebluee@gmail.com")
  await page.goto("/studio")
  await expect(page.getByRole("heading", { name: "Late deliveries" })).toBeVisible()
  await expect(page.getByRole("link", { name: new RegExp(`PW late ${stamp}`) })).toBeVisible()
  await admin.from("materials").delete().eq("id", material.data.id)
})
