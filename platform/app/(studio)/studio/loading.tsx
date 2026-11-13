export default function LoadingStudio() {
  return (
    <div className="grid gap-4" aria-hidden="true">
      <div className="h-4 w-40 animate-pulse rounded-full bg-surface-muted" />
      <div className="h-10 w-72 animate-pulse rounded-full bg-surface-muted" />
      <div className="mt-4 h-48 max-w-xl animate-pulse rounded-[28px] bg-white/70" />
    </div>
  )
}
