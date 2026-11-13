"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"

export type ToastAction = { label: string; run: () => void }

const ToastContext = createContext<(message: string, action?: ToastAction) => void>(() => {})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; action?: ToastAction }>>([])
  const push = useCallback((message: string, action?: ToastAction) => {
    const id = Date.now() + Math.random()
    setToasts((current) => [...current, { id, message, action }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, action ? 8000 : 4200)
  }, [])
  const value = useMemo(() => push, [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 grid max-w-sm gap-2" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto flex items-center gap-3 rounded-full bg-ink px-4 py-2 text-[13px] text-surface shadow-[var(--shadow)]">
            <p>{toast.message}</p>
            {toast.action ? (
              <button
                type="button"
                className="rounded-full bg-surface px-3 py-1 text-ink"
                onClick={() => {
                  toast.action?.run()
                  setToasts((current) => current.filter((item) => item.id !== toast.id))
                }}
              >
                {toast.action.label}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
