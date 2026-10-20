import { motion, useReducedMotion } from "framer-motion"

const blobs = [
  { className: "-left-24 -top-32 h-[540px] w-[540px] bg-[#14B8C4]", x: [0, 48, 0], y: [0, 28, 0] },
  { className: "-right-20 top-24 h-[480px] w-[480px] bg-[#56B6F7]", x: [0, -36, 0], y: [0, 24, 0] },
  { className: "bottom-[-180px] left-[28%] h-[520px] w-[520px] bg-[#5B5BD6]", x: [0, 32, 0], y: [0, -24, 0] },
]

export function Background() {
  const reduce = useReducedMotion()
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {blobs.map((blob) => (
        <motion.div
          key={blob.className}
          className={`absolute rounded-full opacity-[0.18] blur-3xl ${blob.className}`}
          animate={reduce ? undefined : { x: blob.x, y: blob.y }}
          transition={{ duration: 60, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  )
}
