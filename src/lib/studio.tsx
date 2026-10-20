import { useQuery } from "@tanstack/react-query"
import { useEffect, useRef } from "react"
import { toast } from "sonner"
import type { Project, Settings, StudioEvent } from "../data/schemas.ts"
import { getRepository } from "../data/index.ts"

export interface StudioSnapshot {
  projects: Project[]
  events: StudioEvent[]
  settings: Settings
}

export function useStudio() {
  const repo = getRepository()
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => repo.listProjects() })
  const events = useQuery({ queryKey: ["events"], queryFn: () => repo.listEvents() })
  const settings = useQuery({ queryKey: ["settings"], queryFn: () => repo.getSettings() })
  const isLoading = projects.isPending || events.isPending || settings.isPending
  const isError = projects.isError || events.isError || settings.isError
  const data: StudioSnapshot | undefined =
    projects.data && events.data && settings.data
      ? { projects: projects.data, events: events.data, settings: settings.data }
      : undefined

  const refetch = () => Promise.all([projects.refetch(), events.refetch(), settings.refetch()])

  return { data, isLoading, isError, refetch }
}

export function useLoadError(isError: boolean, refetch: () => Promise<unknown>): void {
  const refetchRef = useRef(refetch)
  const toasted = useRef(false)
  useEffect(() => {
    refetchRef.current = refetch
  }, [refetch])
  useEffect(() => {
    if (!isError) {
      toasted.current = false
      return
    }
    if (toasted.current) return
    toasted.current = true
    toast.error("Couldn't load your studio", {
      action: { label: "Retry", onClick: () => void refetchRef.current() },
    })
  }, [isError])
}
