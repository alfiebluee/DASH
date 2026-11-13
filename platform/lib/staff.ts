export type StaffMember = {
  email: string
  full_name: string
  job_title: string
}

export const staff = [
  { email: "alfiebluee@gmail.com", full_name: "Test user", job_title: "" },
  { email: "alfie@asiya.space", full_name: "Alfie", job_title: "" },
  { email: "teddy@go-places.io", full_name: "Teddy", job_title: "Director of Ops" },
  { email: "alexbutler@go-places.io", full_name: "Alex", job_title: "Head of Live Ops" },
  { email: "riley@go-places.io", full_name: "Riley", job_title: "Live Ops Team" },
] as const satisfies readonly StaffMember[]

export function staffByEmail(email: string): StaffMember | null {
  const normalised = email.trim().toLowerCase()
  return staff.find((person) => person.email === normalised) ?? null
}
