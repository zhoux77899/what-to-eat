import { z } from "zod";

import { LOCALES } from "@/lib/locale";

export const localeSchema = z.enum(LOCALES);

export const preferencesSchema = z.object({
  locale: localeSchema,
  preferenceText: z.string().trim().max(1000).default("")
});

export const openAiKeySchema = z.object({
  apiKey: z.string().trim().min(12)
});

export const fridgeItemSchema = z.object({
  name: z.string().trim().min(1).max(80),
  quantity: z.number().positive().max(999999),
  unit: z.string().trim().min(1).max(24)
});

export const fridgeItemUpdateSchema = fridgeItemSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one fridge item field is required"
);

export const fridgeConsumptionSchema = z.object({
  fridgeItemId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  consumedQuantity: z.number().positive().max(999999),
  unit: z.string().trim().min(1).max(24)
});

export const fridgeConsumptionRequestSchema = z.object({
  consumptions: z.array(fridgeConsumptionSchema).min(1).max(50)
});

export const recordIdSchema = z.uuid();

export const recommendRequestSchema = z.object({
  candidateCount: z.number().int().min(1).max(5),
  temporaryRequirement: z.string().trim().min(1).max(500).nullable().default(null)
});
