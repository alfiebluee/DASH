export function ownerEmail(): string {
  return process.env.OWNER_EMAIL?.trim().toLowerCase() || "alfiebluee@gmail.com"
}

export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
      process.env.SUPABASE_SECRET_KEY,
  )
}

export function appUrl(): string {
  return process.env.APP_URL?.replace(/\/$/, "") || "http://127.0.0.1:3000"
}
