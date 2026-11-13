"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"

const ToastContext = createContext<(message: string) => void>(() => {})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Array<{ id: number; message: string }>>([])
  const push = useCallback((message: string) => {
    const id = Date.now() + Math.random()
    setToasts((current) => [...current, { id, message }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 4200)
  }, [])
  const value = useMemo(() => push, [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 grid max-w-sm gap-2" aria-live="polite">
        {toasts.map((toast) => (
          <p key={toast.id} className="pointer-events-auto rounded-full bg-ink px-4 py-2 text-[13px] text-surface shadow-[var(--shadow)]">
            {toast.message}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
