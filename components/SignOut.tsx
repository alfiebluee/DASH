import { signOut } from "@/app/login/actions"

export function SignOut() {
  return (
    <form action={signOut}>
      <button type="submit" className="text-[13px] text-ink-2 hover:text-ink">
        Sign out
      </button>
    </form>
  )
}
