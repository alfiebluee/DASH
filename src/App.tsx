import { TooltipProvider } from "@radix-ui/react-tooltip"
import { useEffect } from "react"
import { Route, Routes } from "react-router-dom"
import { Toaster } from "sonner"
import { CommandPalette } from "./components/chrome/CommandPalette.tsx"
import { Shortcuts } from "./components/chrome/Shortcuts.tsx"
import { DashboardView } from "./components/dashboard/Dashboard.tsx"
import { ManageView } from "./components/manage/Manage.tsx"
import { EventEditor } from "./components/sheets/EventEditor.tsx"
import { ProjectSheet } from "./components/sheets/ProjectSheet.tsx"
import { DashboardSkeleton, LoadError } from "./components/ui/Primitives.tsx"
import { useLoadError, useStudio } from "./lib/studio.tsx"
import { StudioUIProvider } from "./lib/ui-state.tsx"

export default function App() {
  return (
    <TooltipProvider delayDuration={300}>
      <StudioUIProvider>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/manage" element={<ManagePage />} />
        </Routes>
        <ProjectSheet />
        <EventEditor />
        <CommandPalette />
        <Shortcuts />
        <Toaster theme="light" position="bottom-center" />
      </StudioUIProvider>
    </TooltipProvider>
  )
}

function DashboardPage() {
  const studio = useStudio()
  useLoadError(studio.isError, studio.refetch)
  useEffect(() => {
    document.title = "Studio"
  }, [])
  if (studio.isLoading) return <DashboardSkeleton />
  if (!studio.data) return <LoadError onRetry={() => void studio.refetch()} />
  return <DashboardView snapshot={studio.data} now={new Date()} />
}

function ManagePage() {
  const studio = useStudio()
  useLoadError(studio.isError, studio.refetch)
  useEffect(() => {
    document.title = "Manage · Studio"
  }, [])
  if (studio.isLoading) return <DashboardSkeleton />
  if (!studio.data) return <LoadError onRetry={() => void studio.refetch()} />
  return <ManageView snapshot={studio.data} now={new Date()} />
}
