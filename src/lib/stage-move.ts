import { STAGES, type Project, type Stage } from "../data/schemas.ts"

export interface StageChange {
  id: string
  stage: Stage
  sortOrder: number
}

export function planStageDrop(projects: Project[], activeId: string, overId: string): StageChange[] | null {
  const projectId = activeId.startsWith("idea:") ? activeId.slice("idea:".length) : activeId
  const moving = projects.find((project) => project.id === projectId)
  if (!moving || moving.archived) return null

  const destination = destinationStage(projects, overId)
  if (!destination) return null

  const lane = projects
    .filter((project) => !project.archived && project.stage === destination.stage && project.id !== projectId)
    .sort(byOrder)
  const ids = lane.map((project) => project.id)
  const insertAt = destination.beforeId ? Math.max(ids.indexOf(destination.beforeId), 0) : ids.length
  ids.splice(insertAt, 0, projectId)

  const changes: StageChange[] = []
  ids.forEach((id, index) => {
    const current = projects.find((project) => project.id === id)
    if (!current) return
    const stage = id === projectId ? destination.stage : current.stage
    if (current.stage !== stage || current.sortOrder !== index) {
      changes.push({ id, stage, sortOrder: index })
    }
  })

  if (moving.stage !== destination.stage) {
    const previousLane = projects
      .filter((project) => !project.archived && project.stage === moving.stage && project.id !== projectId)
      .sort(byOrder)
    previousLane.forEach((project, index) => {
      if (project.sortOrder !== index) changes.push({ id: project.id, stage: project.stage, sortOrder: index })
    })
  }

  return changes.length > 0 ? changes : null
}

function destinationStage(
  projects: Project[],
  overId: string,
): { stage: Stage; beforeId: string | null } | null {
  if (overId.startsWith("lane:")) {
    const stage = overId.slice("lane:".length)
    if (!isStage(stage)) return null
    return { stage, beforeId: null }
  }
  const over = projects.find((project) => project.id === overId)
  if (!over) return null
  return { stage: over.stage, beforeId: over.id }
}

function isStage(value: string): value is Stage {
  return (STAGES as readonly string[]).includes(value)
}

function byOrder(a: Project, b: Project): number {
  return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
}
