import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonStyles = cva("inline-flex items-center justify-center rounded-full text-[14px] disabled:opacity-60", {
  variants: {
    tone: {
      solid: "bg-brand px-4 py-2 text-surface hover:bg-brand-hover",
      quiet: "px-3 py-2 text-ink-2 hover:text-ink",
      surface: "bg-surface px-4 py-2 text-ink shadow-[var(--shadow)]",
    },
  },
  defaultVariants: { tone: "solid" },
})

export function Button({
  className,
  tone,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles>) {
  return <button className={cn(buttonStyles({ tone }), className)} {...props} />
}
