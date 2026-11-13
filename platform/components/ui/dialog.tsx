"use client"

import * as Dialog from "@radix-ui/react-dialog"

export function Modal({
  title,
  description,
  trigger,
  children,
  open,
  onOpenChange,
}: {
  title: string
  description?: string
  trigger?: React.ReactNode
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/30" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(100%-2rem,32rem)] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-[28px] bg-surface p-6 text-ink shadow-[var(--shadow)]">
          <Dialog.Title className="text-[22px] font-normal tracking-[-0.03em]">{title}</Dialog.Title>
          {description ? <Dialog.Description className="mt-2 text-[14px] text-ink-2">{description}</Dialog.Description> : null}
          <div className="mt-4">{children}</div>
          <Dialog.Close className="mt-4 text-[13px] text-ink-3">Close</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
