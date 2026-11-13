export type StaffAccess = "owner" | "viewer"

export type StaffMember = {
  email: string
  full_name: string
  job_title: string
  access: StaffAccess
}

export const staff = [
  { email: "alfiebluee@gmail.com", full_name: "Alfie", job_title: "", access: "owner" },
  { email: "alfie@asiya.space", full_name: "Alfie", job_title: "", access: "owner" },
  { email: "teddy@go-places.io", full_name: "Teddy", job_title: "Director of Ops", access: "viewer" },
  { email: "alexbutler@go-places.io", full_name: "Alex", job_title: "Head of Live Ops", access: "viewer" },
  { email: "riley@go-places.io", full_name: "Riley", job_title: "Live Ops Team", access: "viewer" },
] as const satisfies readonly StaffMember[]

export function staffByEmail(email: string): StaffMember | null {
  const normalised = email.trim().toLowerCase()
  return staff.find((person) => person.email === normalised) ?? null
}
