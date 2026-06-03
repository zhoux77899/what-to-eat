import { z } from "zod";

import { normalizeFridgeItemIdentity } from "@/lib/fridge-items";
import { localeSchema } from "@/server/validation";

export const dishConsumptionSuggestionSchema = z.object({
  fridgeItemId: z.uuid(),
  consumedQuantity: z.number().positive(),
  unit: z.string().trim().min(1).max(24)
});

export const recommendedDishResultSchema = z.object({
  name: z.string().trim().min(1).max(120),
  summary: z.string().trim().min(1).max(500),
  instructions: z.array(z.string().trim().min(1).max(500)).min(1).max(20),
  estimatedMinutes: z.number().int().positive().max(1440),
  consumptions: z.array(dishConsumptionSuggestionSchema).max(50)
});

export const recommendationResultSchema = z.object({
  dishes: z.array(recommendedDishResultSchema).min(1).max(5)
});

export const recommendationResultJsonSchema = z.toJSONSchema(recommendationResultSchema);

export type RecommendedDishResult = z.infer<typeof recommendedDishResultSchema>;
export type RecommendationResult = z.infer<typeof recommendationResultSchema>;

export type RecommendationPromptInput = {
  locale: z.infer<typeof localeSchema>;
  candidateCount: number;
  preferenceText: string;
  temporaryRequirement: string | null;
  fridgeItems: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
  }>;
};

export function toPersistedDish(dish: RecommendedDishResult) {
  return {
    name: dish.name,
    summary: dish.summary,
    instructions: dish.instructions,
    estimatedMinutes: dish.estimatedMinutes
  };
}

export function enrichConsumptionSuggestions(
  suggestions: RecommendedDishResult["consumptions"],
  fridgeItems: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
    version: number;
  }>
) {
  const itemsById = new Map(fridgeItems.map((item) => [item.id, item]));

  return suggestions.flatMap((suggestion) => {
    const item = itemsById.get(suggestion.fridgeItemId);

    if (
      !item ||
      suggestion.consumedQuantity > item.quantity ||
      normalizeFridgeItemIdentity("", suggestion.unit).normalizedUnit !==
        normalizeFridgeItemIdentity("", item.unit).normalizedUnit
    ) {
      return [];
    }

    return [
      {
        fridgeItemId: item.id,
        fridgeItemName: item.name,
        expectedVersion: item.version,
        consumedQuantity: suggestion.consumedQuantity,
        unit: item.unit
      }
    ];
  });
}

export function buildRecommendationPrompt(input: RecommendationPromptInput) {
  const language = input.locale === "zh" ? "Simplified Chinese" : "English";
  const fridgeList = input.fridgeItems
    .map((item) => `- ${item.id}: ${item.name} ${item.quantity} ${item.unit}`)
    .join("\n");

  return [
    "Recommend meals using only the available fridge items listed below.",
    `Return exactly ${input.candidateCount} dish candidate${input.candidateCount === 1 ? "" : "s"}.`,
    `Write user-visible name, summary, and instructions in ${language}.`,
    "For each dish, suggest consumptions using the exact fridgeItemId and unit from the list.",
    "Consumption suggestions are advisory and must never exceed the available quantities.",
    "",
    "Long-term preference:",
    input.preferenceText || "(none)",
    "",
    "Temporary requirement for this request only:",
    input.temporaryRequirement || "(none)",
    "",
    "Available fridge items:",
    fridgeList || "(empty)"
  ].join("\n");
}
