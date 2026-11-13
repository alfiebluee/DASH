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
  notes: z.string().trim().max(4000),
  link: z.string().trim().max(2000),
})

export const materialStatusSchema = z.enum(["to_order", "ordered", "delivered", "late", "cancelled"])

const dayField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()

const dayOrTimestamp = z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Use a real date").nullable()

export const materialRestoreSchema = z.object({
  id: z.uuid(),
  item: z.string().trim().min(1).max(160),
  spec: z.string().trim().max(400),
  quantity: z.number().min(0),
  unit_cost: z.number().min(0),
  actual_cost: z.number().min(0).nullable(),
  supplier_id: z.uuid().nullable(),
  area_id: z.uuid().nullable(),
  order_id: z.uuid().nullable(),
  lead_days: z.number().int().min(0).nullable(),
  priority: z.enum(["normal", "high"]),
  notes: z.string().trim().max(4000),
  link: z.string().trim().max(2000),
  status: materialStatusSchema,
  ordered_at: dayField,
  expected_at: dayField,
  delivered_at: dayOrTimestamp,
  sort_order: z.number().int().min(0),
})

export const materialPatchSchema = z.object({
  item: z.string().trim().min(1).max(160).optional(),
  spec: z.string().trim().max(400).optional(),
  quantity: z.number().min(0).optional(),
  unit_cost: z.number().min(0).optional(),
  actual_cost: z.number().min(0).nullable().optional(),
  supplier_id: z.uuid().nullable().optional(),
  area_id: z.uuid().nullable().optional(),
  order_id: z.uuid().nullable().optional(),
  lead_days: z.number().int().min(0).nullable().optional(),
  priority: z.enum(["normal", "high"]).optional(),
  notes: z.string().trim().max(4000).optional(),
  link: z.string().trim().max(2000).optional(),
  status: materialStatusSchema.optional(),
  ordered_at: dayField.optional(),
  expected_at: dayField.optional(),
  delivered_at: dayField.optional(),
  sort_order: z.number().int().min(0).optional(),
})

export const plannedItemSchema = z.object({
  item: z.string().trim().min(1).max(160),
  spec: z.string().trim().max(400).default(""),
  quantity: z.number().min(0),
  unit_cost: z.number().min(0),
  supplier_name: z.string().trim().max(120).default(""),
  link: z.string().trim().max(2000).default(""),
  notes: z.string().trim().max(4000).default(""),
  lead_days: z.number().int().min(0).nullable(),
  priority: z.enum(["normal", "high"]),
  status: materialStatusSchema,
  ordered_at: dayField,
  expected_at: dayField,
  delivered_at: dayField,
})

export const importSchema = z.array(z.object({
  area: z.string().trim().max(80).nullable(),
  items: z.array(plannedItemSchema).max(400),
})).max(80)

export const orderFormSchema = z.object({
  supplier_id: z.uuid("Choose a supplier").or(z.literal("")),
  reference: z.string().trim().max(80),
  vat: z.number().min(0),
  vat_included: z.boolean(),
  delivery: z.number().min(0),
  paid_with: z.string().trim().max(40),
  status: z.enum(["draft", "ordered", "delivered", "late", "cancelled"]),
  expected_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")),
})

export const budgetAmountSchema = z.number().min(0).max(10000000)

export const customLineSchema = z.object({
  label: z.string().trim().min(1, "Name the line").max(80),
  amount: budgetAmountSchema,
})
