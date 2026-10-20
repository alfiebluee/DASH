import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import App from "../../App.tsx"

function renderApp(path = "/") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }
  return render(<App />, { wrapper: Wrapper })
}

describe("studio screens", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it("renders the control centre from the seeded projects", async () => {
    renderApp("/")
    expect(await screen.findByRole("heading", { level: 2, name: "Parameter Marketing" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /Alfie/ })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Stages" })).toBeInTheDocument()
    expect(screen.getAllByText("Go Places site visit").length).toBeGreaterThan(0)
    expect(screen.getByRole("link", { name: "Manage" })).toHaveAttribute("href", "/manage")
  })

  it("renders the manage view for the same projects", async () => {
    renderApp("/manage")
    expect(await screen.findByRole("heading", { level: 1, name: /in motion/ })).toBeInTheDocument()
    expect(screen.getAllByText("Walk client through final review round").length).toBeGreaterThan(0)
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/")
  })

  it("moves a focused project with the keyboard and undoes it", async () => {
    const user = userEvent.setup()
    renderApp("/")
    const card = await screen.findByRole("group", { name: "Taste Labs" })
    card.focus()
    await user.keyboard("2")
    expect(await screen.findByRole("region", { name: "Brief" })).toContainElement(
      screen.getByRole("group", { name: "Taste Labs" }),
    )
    await user.click(await screen.findByRole("button", { name: "Undo" }))
    await waitFor(() => {
      expect(screen.getByRole("region", { name: "Pipeline" })).toContainElement(
        screen.getByRole("group", { name: "Taste Labs" }),
      )
    })
  })

  it("creates a project from the stage board", async () => {
    const user = userEvent.setup()
    renderApp("/")
    await screen.findByRole("heading", { name: "Stages" })
    await user.click(screen.getByRole("button", { name: "New" }))
    await user.type(screen.getByRole("textbox", { name: "Name" }), "Trip")
    await user.click(screen.getByRole("button", { name: "Create" }))
    expect(await screen.findByRole("group", { name: "Trip" })).toBeInTheDocument()
  })

  it("saves the focus next action", async () => {
    const user = userEvent.setup()
    renderApp("/")
    await user.click(await screen.findByRole("button", { name: /Edit next action/ }))
    const field = screen.getByRole("textbox", { name: "Next action" })
    await user.clear(field)
    await user.type(field, "Send the notes{Enter}")
    expect(await screen.findByText("Send the notes")).toBeInTheDocument()
  })

  it("opens the active projects from Pulse", async () => {
    const user = userEvent.setup()
    renderApp("/")
    await user.click(await screen.findByRole("button", { name: /Active, / }))
    expect(await screen.findByRole("heading", { level: 1, name: /in motion/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Active" })).toHaveAttribute("aria-pressed", "true")
  })
})
