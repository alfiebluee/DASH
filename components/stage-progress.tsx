import { stageLabel, stages, type Stage } from "@/lib/labels"

export function StageProgress({ stage }: { stage: Stage }) {
  const current = stages.indexOf(stage)
  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {stages.map((item, index) => (
        <li key={item} className={index === current ? "text-ink" : "text-ink-3"}>
          <span className={`mb-1 block h-1 rounded-full ${index <= current ? "bg-brand" : "bg-line"}`} />
          <span className="text-[11px] uppercase tracking-[0.08em]">{stageLabel(item)}</span>
        </li>
      ))}
    </ol>
  )
}
