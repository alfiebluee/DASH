import { SettingsForm } from "@/components/settings-form"
import { loadSettings, loadStaff } from "@/lib/data"

export default async function SettingsPage() {
  const [settings, people] = await Promise.all([loadSettings(), loadStaff()])

  return (
    <main>
      <p className="text-[12px] uppercase tracking-[0.16em] text-ink-3">Settings</p>
      <h1 className="mt-2 text-[32px] font-light tracking-[-0.03em]">Business</h1>
      <div className="mt-8">
        <SettingsForm settings={settings} />
      </div>
      <section className="mt-8 max-w-lg rounded-[28px] bg-surface p-8 shadow-[var(--shadow)]">
        <h2 className="text-[22px] font-normal">Access</h2>
        <p className="mt-2 text-[14px] leading-6 text-ink-2">
          Full access can change the studio. Look only can see the projects, documents, materials, orders and budgets, and cannot change them.
        </p>
        <ul className="mt-4 grid gap-3">
          {people.map((person) => (
            <li key={person.email}>
              <p className="text-[15px]">{person.full_name}</p>
              {person.job_title ? <p className="text-[13px] text-ink-2">{person.job_title}</p> : null}
              <p className="text-[13px] text-ink-3">{person.email}</p>
              <p className="text-[13px] text-ink-2">{person.access === "owner" ? "Full access" : "Look only"}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
