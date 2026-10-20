import type { Variants } from "framer-motion"

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}

export const rise: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 400, damping: 32 },
  },
}
