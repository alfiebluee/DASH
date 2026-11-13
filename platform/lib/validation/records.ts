import { z } from "zod"

import { stages, statuses, uploadKinds } from "@/lib/labels"

const dateField = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal(""))

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .refine((value) => value === "" || z.email().safeParse(value).success, "Enter a valid email")

export const clientFormSchema = z.object({
  name: z.string().trim().min(1, "Give the client a name").max(120),
  company: z.string().trim().max(120),
  email: optionalEmail,
  phone: z.string().trim().max(40),
})

export const projectFormSchema = z
  .object({
    client_id: z.uuid("Choose a client"),
    name: z.string().trim().min(1, "Give the project a name").max(160),
    type: z.string().trim().max(80),
    stage: z.enum(stages),
    status: z.enum(statuses),
    start_date: dateField,
    due_date: dateField,
    description: z.string().trim().max(4000),
  })
  .transform((value) => ({
    ...value,
    status: !value.due_date && value.status === "active" ? "ongoing" as const : value.status,
    start_date: value.start_date || null,
    due_date: value.due_date || null,
  }))

export const documentFormSchema = z.object({
  kind: z.enum(uploadKinds),
  title: z.string().trim().min(1, "Give the document a title").max(160),
})

export const approvalSchema = z.object({
  document_id: z.uuid(),
  comment: z.string().trim().max(2000),
})

export const stageSchema = z.enum(stages)

export const supplierFormSchema = z.object({
  name: z.string().trim().min(1, "Give the supplier a name").max(120),
  website: z.string().trim().max(200),
  default_lead_days: z.coerce.number().int().min(0).max(365),
})

export const areaFormSchema = z.object({
  name: z.string().trim().min(1, "Give the area a name").max(80),
})

export const materialFormSchema = z.object({
  item: z.string().trim().min(1, "Name the item").max(160),
  spec: z.string().trim().max(400),
  quantity: z.coerce.number().min(0),
  unit_cost: z.coerce.number().min(0),
  supplier_id: z.uuid().or(z.literal("")),
  area_id: z.uuid().or(z.literal("")),
  lead_days: z.string().trim(),
  priority: z.enum(["normal", "high"]),
  notes: z.string().trim().max(2000),
  link: z.string().trim().max(400),
})
