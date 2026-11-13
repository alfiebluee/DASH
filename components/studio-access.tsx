"use client"

import { createContext, useContext } from "react"

const StudioAccessContext = createContext(true)

export function StudioAccess({ canEdit, children }: { canEdit: boolean; children: React.ReactNode }) {
  return <StudioAccessContext.Provider value={canEdit}>{children}</StudioAccessContext.Provider>
}

export function useCanEdit(): boolean {
  return useContext(StudioAccessContext)
}
