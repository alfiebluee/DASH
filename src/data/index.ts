import { LocalAdapter } from "./local-adapter.ts"
import type { KeyValueStore, StudioRepository } from "./repo.ts"

let singleton: StudioRepository | undefined

export function createRepository(store: KeyValueStore): StudioRepository {
  return new LocalAdapter(store)
}

export function getRepository(): StudioRepository {
  if (!singleton) singleton = createRepository(localStorage)
  return singleton
}
