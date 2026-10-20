import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { getRepository } from "../data/index.ts"
import type { EventCreate, EventPatch, Project, ProjectCreate, ProjectPatch, Settings, SettingsPatch, StudioEvent } from "../data/schemas.ts"

const PROJECTS = ["projects"] as const
const EVENTS = ["events"] as const
const SETTINGS = ["settings"] as const

export interface ProjectWrite {
  id: string
  patch: ProjectPatch
}

function report(message: string, retry: () => void) {
  toast.error(message, { action: { label: "Retry", onClick: retry } })
}

export function undoToast(message: string, undo: () => Promise<unknown>) {
  toast(message, {
    action: {
      label: "Undo",
      onClick: () => {
        void undo().catch(() => toast.error("Couldn't undo that"))
      },
    },
  })
}

export function useStudioMutations() {
  const queryClient = useQueryClient()
  const repo = getRepository()
  const patchRef = useRef<(writes: ProjectWrite[]) => void>(() => {})
  const updateEventRef = useRef<(input: { id: string; patch: EventPatch }) => void>(() => {})
  const createProjectRef = useRef<(input: ProjectCreate) => void>(() => {})
  const createEventRef = useRef<(input: EventCreate) => void>(() => {})
  const deleteProjectRef = useRef<(id: string) => void>(() => {})
  const deleteEventRef = useRef<(id: string) => void>(() => {})
  const settingsRef = useRef<(patch: SettingsPatch) => void>(() => {})

  const patchProjects = useMutation({
    mutationFn: async (writes: ProjectWrite[]) => {
      let latest: Project | null = null
      for (const write of writes) {
        latest = await repo.updateProject(write.id, write.patch)
      }
      return latest
    },
    onMutate: async (writes) => {
      await queryClient.cancelQueries({ queryKey: PROJECTS })
      const previous = queryClient.getQueryData<Project[]>(PROJECTS)
      queryClient.setQueryData<Project[]>(PROJECTS, (current) =>
        current?.map((project) => {
          const write = writes.find((item) => item.id === project.id)
          return write ? { ...project, ...write.patch } : project
        }),
      )
      return { previous }
    },
    onError: (_error, writes, context) => {
      if (context?.previous) queryClient.setQueryData(PROJECTS, context.previous)
      report("Couldn't save that change", () => patchRef.current(writes))
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: PROJECTS }),
  })

  const createProject = useMutation({
    mutationFn: (input: ProjectCreate) => repo.createProject(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: PROJECTS })
      const previous = queryClient.getQueryData<Project[]>(PROJECTS)
      const now = new Date().toISOString()
      const temp: Project = { ...input, id: `temp_${crypto.randomUUID()}`, createdAt: now, updatedAt: now }
      queryClient.setQueryData<Project[]>(PROJECTS, (current) => [...(current ?? []), temp])
      return { previous, tempId: temp.id }
    },
    onSuccess: (created, _input, context) => {
      queryClient.setQueryData<Project[]>(PROJECTS, (current) =>
        current?.map((project) => (project.id === context?.tempId ? created : project)),
      )
    },
    onError: (_error, input, context) => {
      if (context?.previous) queryClient.setQueryData(PROJECTS, context.previous)
      report("Couldn't add that project", () => createProjectRef.current(input))
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: PROJECTS }),
  })

  const deleteProject = useMutation({
    mutationFn: (id: string) => repo.deleteProject(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: PROJECTS })
      await queryClient.cancelQueries({ queryKey: EVENTS })
      const previousProjects = queryClient.getQueryData<Project[]>(PROJECTS)
      const previousEvents = queryClient.getQueryData<StudioEvent[]>(EVENTS)
      queryClient.setQueryData<Project[]>(PROJECTS, (current) => current?.filter((project) => project.id !== id))
      queryClient.setQueryData<StudioEvent[]>(EVENTS, (current) => current?.filter((event) => event.projectId !== id))
      return { previousProjects, previousEvents }
    },
    onError: (_error, id, context) => {
      if (context?.previousProjects) queryClient.setQueryData(PROJECTS, context.previousProjects)
      if (context?.previousEvents) queryClient.setQueryData(EVENTS, context.previousEvents)
      report("Couldn't delete that project", () => deleteProjectRef.current(id))
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: PROJECTS })
      void queryClient.invalidateQueries({ queryKey: EVENTS })
    },
  })

  const createEvent = useMutation({
    mutationFn: (input: EventCreate) => repo.createEvent(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: EVENTS })
      const previous = queryClient.getQueryData<StudioEvent[]>(EVENTS)
      const temp: StudioEvent = { ...input, id: `temp_${crypto.randomUUID()}` }
      queryClient.setQueryData<StudioEvent[]>(EVENTS, (current) => [...(current ?? []), temp])
      return { previous, tempId: temp.id }
    },
    onSuccess: (created, _input, context) => {
      queryClient.setQueryData<StudioEvent[]>(EVENTS, (current) =>
        current?.map((event) => (event.id === context?.tempId ? created : event)),
      )
    },
    onError: (_error, input, context) => {
      if (context?.previous) queryClient.setQueryData(EVENTS, context.previous)
      report("Couldn't add that date", () => createEventRef.current(input))
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: EVENTS }),
  })

  const updateEvent = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: EventPatch }) => repo.updateEvent(id, patch),
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: EVENTS })
      const previous = queryClient.getQueryData<StudioEvent[]>(EVENTS)
      queryClient.setQueryData<StudioEvent[]>(EVENTS, (current) =>
        current?.map((event) => (event.id === id ? { ...event, ...patch } : event)),
      )
      return { previous }
    },
    onError: (_error, input, context) => {
      if (context?.previous) queryClient.setQueryData(EVENTS, context.previous)
      report("Couldn't save that date", () => updateEventRef.current(input))
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: EVENTS }),
  })

  const deleteEvent = useMutation({
    mutationFn: (id: string) => repo.deleteEvent(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: EVENTS })
      const previous = queryClient.getQueryData<StudioEvent[]>(EVENTS)
      queryClient.setQueryData<StudioEvent[]>(EVENTS, (current) => current?.filter((event) => event.id !== id))
      return { previous }
    },
    onError: (_error, id, context) => {
      if (context?.previous) queryClient.setQueryData(EVENTS, context.previous)
      report("Couldn't delete that date", () => deleteEventRef.current(id))
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: EVENTS }),
  })

  const updateSettings = useMutation({
    mutationFn: (patch: SettingsPatch) => repo.updateSettings(patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: SETTINGS })
      const previous = queryClient.getQueryData<Settings>(SETTINGS)
      queryClient.setQueryData<Settings>(SETTINGS, (current) => (current ? { ...current, ...patch } : current))
      return { previous }
    },
    onError: (_error, patch, context) => {
      if (context?.previous) queryClient.setQueryData(SETTINGS, context.previous)
      report("Couldn't save settings", () => settingsRef.current(patch))
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: SETTINGS }),
  })

  useEffect(() => {
    patchRef.current = (writes) => patchProjects.mutate(writes)
    updateEventRef.current = (input) => updateEvent.mutate(input)
    createProjectRef.current = (input) => createProject.mutate(input)
    createEventRef.current = (input) => createEvent.mutate(input)
    deleteProjectRef.current = (id) => deleteProject.mutate(id)
    deleteEventRef.current = (id) => deleteEvent.mutate(id)
    settingsRef.current = (patch) => updateSettings.mutate(patch)
  }, [patchProjects, updateEvent, createProject, createEvent, deleteProject, deleteEvent, updateSettings])

  return { patchProjects, createProject, deleteProject, createEvent, updateEvent, deleteEvent, updateSettings }
}
