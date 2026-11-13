import { SignInForm } from "@/components/sign-in-form"
import { supabaseConfigured } from "@/lib/env"
import { emailSchema } from "@/lib/validation/settings"

const messages: Record<string, string> = {
  invalid: "Enter a valid email.",
  uninvited: "This email isn't invited.",
  send: "The code could not be sent. Try again in a minute.",
  code: "That code is not right. Check the email and try again.",
  link: "That link did not sign you in. Enter the code from the email instead.",
  config: "Supabase is not running on this computer yet.",
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; code?: string; email?: string }>
}) {
  const params = await searchParams
  const connected = supabaseConfigured()
  const email = params.code === "1" ? emailSchema.safeParse(params.email ?? "") : null
  const codeEmail = email?.success ? email.data.toLowerCase() : undefined
  const message = params.error ? messages[params.error] : null

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <p className="text-[11px] uppercase tracking-[0.18em] text-ink-3">Studio</p>
      <h1 className="mt-3 text-[36px] font-light tracking-[-0.03em]">Sign in</h1>
      <p className="mt-2 text-[15px] leading-6 text-ink-2">
        {codeEmail
          ? `Enter the code sent to ${codeEmail}.`
          : connected
            ? "We'll email you a code. No password."
            : "Install Docker and the Supabase CLI, then start the local database. Sign-in emails you a code. There is no password."}
      </p>
      {message ? (
        <p role="alert" className="mt-4 text-[14px] text-danger">
          {message}
        </p>
      ) : null}
      <SignInForm email={codeEmail} />
    </main>
  )
}
