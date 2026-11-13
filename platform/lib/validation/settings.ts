import { z } from "zod"

export const settingsFormSchema = z.object({
  business_name: z.string().trim().min(1, "Give the business a name").max(80),
  business_email: z.email("Enter a valid email"),
  deposit_percent: z.coerce.number().min(0).max(100),
  away_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")),
  away_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")),
})

export const emailSchema = z.email("Enter a valid email")
