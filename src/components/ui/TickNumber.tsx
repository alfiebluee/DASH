import { useReducedMotion } from "framer-motion"
import { useEffect, useState } from "react"

export function TickNumber({ value }: { value: number }) {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(0)

  useEffect(() => {
    if (reduce) return
    const started = performance.now()
    let frame = 0
    const step = (now: number) => {
      const progress = Math.min(1, (now - started) / 320)
      const eased = 1 - (1 - progress) ** 3
      setShown(Math.round(value * eased))
      if (progress < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [reduce, value])

  return (
    <>
      <span className="tabular-nums" aria-hidden="true">
        {reduce ? value : shown}
      </span>
      <span className="sr-only">{value}</span>
    </>
  )
}
