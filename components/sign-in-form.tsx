"use client"

import { useFormStatus } from "react-dom"

import { signIn, verifyCode } from "@/app/login/actions"

export function SignInForm({ email }: { email?: string }) {
  if (email) {
    return (
      <form action={verifyCode} className="mt-8 grid gap-3">
        <input type="hidden" name="email" value={email} />
        <CodeFields />
      </form>
    )
  }

  return (
    <form action={signIn} className="mt-8 grid gap-3">
      <EmailFields />
    </form>
  )
}

function EmailFields() {
  const { pending } = useFormStatus()

  return (
    <>
      <label className="grid gap-1 text-[13px] text-ink-2" htmlFor="email">
        Email
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pending}
          className="rounded-2xl border border-line bg-surface px-3 py-2 text-[15px] text-ink disabled:opacity-70"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="mt-2 w-fit rounded-full bg-brand px-4 py-2 text-[14px] text-white hover:bg-brand-hover disabled:opacity-80"
      >
        {pending ? "Sending your code" : "Continue"}
      </button>
      <Progress pending={pending} />
    </>
  )
}

function CodeFields() {
  const { pending } = useFormStatus()

  return (
    <>
      <label className="grid gap-1 text-[13px] text-ink-2" htmlFor="code">
        Code
        <input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          required
          maxLength={8}
          pattern="[0-9]{6,8}"
          disabled={pending}
          className="rounded-2xl border border-line bg-surface px-3 py-3 text-center text-[28px] tracking-[0.28em] text-ink disabled:opacity-70"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="mt-2 w-fit rounded-full bg-brand px-4 py-2 text-[14px] text-white hover:bg-brand-hover disabled:opacity-80"
      >
        {pending ? "Checking your code" : "Continue"}
      </button>
      <Progress pending={pending} />
      <a href="/login" className="w-fit text-[13px] text-ink-2 underline">
        Use a different email
      </a>
    </>
  )
}

function Progress({ pending }: { pending: boolean }) {
  return (
    <>
      <div className="h-1.5 overflow-hidden rounded-full" aria-hidden="true">
        {pending ? (
          <div className="h-full rounded-full bg-brand-tint">
            <div className="sign-in-bar h-full rounded-full bg-brand" />
          </div>
        ) : null}
      </div>
      <p className="min-h-5 text-[13px] text-ink-2" aria-live="polite">
        {pending ? "This usually takes a moment." : ""}
      </p>
    </>
  )
}
