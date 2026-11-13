import { SignInForm } from "@/components/sign-in-form"
import { supabaseConfigured } from "@/lib/env"

const messages: Record<string, string> = {
  invalid: "Enter a valid email.",
  uninvited: "This email isn't invited.",
  send: "The sign-in email could not be sent. Try again in a minute.",
  link: "That sign-in link has expired or was already used. Request another one.",
  config: "Supabase is not running on this computer yet.",
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>
}) {
  const params = await searchParams
  const connected = supabaseConfigured()
  const message = params.error ? messages[params.error] : null

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <p className="text-[11px] uppercase tracking-[0.18em] text-ink-3">Studio</p>
      <h1 className="mt-3 text-[36px] font-light tracking-[-0.03em]">Sign in</h1>
      <p className="mt-2 text-[15px] leading-6 text-ink-2">
        {connected
          ? "We'll email you a sign-in link. No password."
          : "Install Docker and the Supabase CLI, then start the local database. Sign-in sends a magic link. There is no password."}
      </p>
      {message ? (
        <p role="alert" className="mt-4 text-[14px] text-danger">
          {message}
        </p>
      ) : null}
      {params.sent ? <p className="mt-4 text-[14px] text-brand">Check your email for a sign-in link.</p> : null}
      <SignInForm />
    </main>
  )
}
