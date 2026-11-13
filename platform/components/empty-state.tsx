export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <section className="rounded-[28px] bg-surface p-8 shadow-[var(--shadow)]">
      <h2 className="text-[22px] font-normal tracking-[-0.03em]">{title}</h2>
      <p className="mt-2 max-w-md text-[15px] leading-6 text-ink-2">{body}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </section>
  )
}
