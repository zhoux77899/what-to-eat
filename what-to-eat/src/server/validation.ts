import { z } from "zod";

import { LOCALES } from "@/lib/locale";

export const localeSchema = z.enum(LOCALES);

export const preferencesSchema = z.object({
  locale: localeSchema,
  dietaryRestrictions: z.array(z.string().trim().min(1)).default([]),
  dislikedFoods: z.array(z.string().trim().min(1)).default([]),
  budgetLevel: z.enum(["low", "medium", "high"]).default("medium"),
  locationHint: z.string().trim().min(1).nullable().default(null)
});

export const preferenceOverridesSchema = preferencesSchema.partial();

export const openAiKeySchema = z.object({
  apiKey: z.string().trim().min(12)
});

export const recommendRequestSchema = z.object({
  temporaryOverrides: preferenceOverridesSchema.default({}),
  includeMealImage: z.boolean().default(true)
});
