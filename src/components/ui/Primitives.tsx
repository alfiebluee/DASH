import type { ReactNode } from "react"
import type { Status } from "../../data/schemas.ts"
import { cn } from "../../lib/cn.ts"
import { statusStyles } from "../../styles/tokens.ts"

export function Card({
  className,
  children,
  id,
}: {
  className?: string
  children: ReactNode
  id?: string
}) {
  return (
    <section id={id} className={cn("rounded-[28px] border border-line bg-surface shadow-card backdrop-blur-xl", className)}>
      {children}
    </section>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">{children}</p>
}

export function StatusPill({ status }: { status: Status }) {
  const style = statusStyles[status]
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium leading-none"
      style={{ color: style.color, background: style.background }}
    >
      {status}
    </span>
  )
}

export function ProgressRing({
  value,
  colour,
  size = 76,
  stroke = 6,
  label,
}: {
  value: number
  colour: string
  size?: number
  stroke?: number
  label?: string
}) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const safe = Math.min(100, Math.max(0, value))
  const offset = circumference - (safe / 100) * circumference
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(15,28,36,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colour}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {label ? (
        <div className="absolute inset-0 grid place-items-center text-[12px] font-medium text-ink">{label}</div>
      ) : (
        <span className="sr-only">{Math.round(safe)} percent</span>
      )}
    </div>
  )
}

export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="text-[32px] font-light tracking-tight">Studio couldn&apos;t load</h1>
      <p className="mt-2 text-sm text-ink-2">Your projects are still on this computer. Try again.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
      >
        Retry
      </button>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1344px] px-4 py-6 sm:px-6">
      <div className="h-4 w-40 animate-pulse rounded-full bg-white/80 motion-reduce:animate-none" />
      <div className="mt-3 h-12 w-72 animate-pulse rounded-2xl bg-white/80 motion-reduce:animate-none" />
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <div className="h-80 animate-pulse rounded-[28px] bg-white/70 motion-reduce:animate-none lg:col-span-5" />
        <div className="h-80 animate-pulse rounded-[28px] bg-white/70 motion-reduce:animate-none lg:col-span-7" />
      </div>
      <div className="mt-6 h-72 animate-pulse rounded-[28px] bg-white/70 motion-reduce:animate-none" />
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="h-72 animate-pulse rounded-[28px] bg-white/70 motion-reduce:animate-none" />
        <div className="h-72 animate-pulse rounded-[28px] bg-white/70 motion-reduce:animate-none" />
        <div className="h-72 animate-pulse rounded-[28px] bg-white/70 motion-reduce:animate-none" />
      </div>
      <span className="sr-only">Loading studio</span>
    </div>
  )
}
