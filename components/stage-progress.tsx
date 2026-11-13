import { stageLabel, stages, type Stage } from "@/lib/labels"

export function StageProgress({ stage }: { stage: Stage }) {
  const current = stages.indexOf(stage)
  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-7">
      {stages.map((item, index) => (
        <li key={item} className={`min-w-0 ${index === current ? "text-ink" : "text-ink-3"}`}>
          <span className={`mb-1 block h-1 rounded-full ${index <= current ? "bg-brand" : "bg-line"}`} />
          <span className="block break-words text-[10px] uppercase leading-tight tracking-[0.04em]">{stageLabel(item)}</span>
        </li>
      ))}
    </ol>
  )
}
