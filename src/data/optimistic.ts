export interface OptimisticResult<T> {
  next: T
  undo: () => T
}

export function applyOptimistic<T>(current: T, recipe: (draft: T) => void): OptimisticResult<T> {
  const snapshot = structuredClone(current)
  const next = structuredClone(current)
  recipe(next)
  return {
    next,
    undo: () => structuredClone(snapshot),
  }
}
