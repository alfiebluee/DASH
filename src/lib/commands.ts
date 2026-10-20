import type { Colour, Project, ProjectPatch, Stage, Status } from "../data/schemas.ts"
import { planStageDrop } from "./stage-move.ts"
import { useStudio } from "./studio.tsx"
import { undoToast, useStudioMutations, type ProjectWrite } from "./mutations.ts"
import { useStudioUI } from "./ui-state.tsx"

export function useCommands() {
  const studio = useStudio()
  const ui = useStudioUI()
  const mutations = useStudioMutations()
  const projects = studio.data?.projects ?? []

  async function drop(activeId: string, overId: string) {
    const changes = planStageDrop(projects, activeId, overId)
    if (!changes) return
    const before: ProjectWrite[] = changes.flatMap((change) => {
      const project = projects.find((item) => item.id === change.id)
      if (!project) return []
      return [{ id: change.id, patch: { stage: project.stage, sortOrder: project.sortOrder } }]
    })
    const movingId = activeId.startsWith("idea:") ? activeId.slice("idea:".length) : activeId
    const previous = projects.find((project) => project.id === movingId)
    const next = changes.find((change) => change.id === movingId)
    await mutations.patchProjects.mutateAsync(changes.map((change) => ({ id: change.id, patch: { stage: change.stage, sortOrder: change.sortOrder } })))
    if (!next || !previous) return
    const message = next.stage === previous.stage ? "Reordered" : `Moved to ${next.stage}`
    undoToast(message, () => mutations.patchProjects.mutateAsync(before))
  }

  function saveProject(id: string, patch: ProjectPatch) {
    return mutations.patchProjects.mutateAsync([{ id, patch }])
  }

  function pin(project: Project, pinned: boolean) {
    const writes: ProjectWrite[] = pinned
      ? projects.filter((item) => item.pinned || item.id === project.id).map((item) => ({ id: item.id, patch: { pinned: item.id === project.id } }))
      : [{ id: project.id, patch: { pinned: false } }]
    return mutations.patchProjects.mutateAsync(writes)
  }

  function archive(project: Project) {
    void saveProject(project.id, { archived: true }).then(() => {
      if (ui.sessionFocusId === project.id) ui.setSessionFocusId(null)
      ui.closeProject()
      undoToast(`Archived ${project.name}`, () => saveProject(project.id, { archived: false }))
    })
  }

  return {
    projects,
    events: studio.data?.events ?? [],
    settings: studio.data?.settings,
    drop,
    saveProject,
    pin,
    archive,
    setStage: (id: string, stage: Stage) => drop(id, `lane:${stage}`),
    setStatus: (id: string, status: Status) => saveProject(id, { status }),
    setColour: (id: string, colour: Colour) => saveProject(id, { colour }),
    mutations,
    ui,
  }
}
