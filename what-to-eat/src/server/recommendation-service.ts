import type { z } from "zod";

import { resolveRecommendationContext } from "@/lib/preferences";
import { buildRecommendationPrompt, enrichConsumptionSuggestions } from "@/lib/recommendations";
import { BusinessError } from "@/server/business-error";
import {
  attachDishImage,
  ensureUser,
  getDish,
  getPreferences,
  listFridgeItems,
  reserveGenerationCapacity,
  saveRecommendation
} from "@/server/data";
import { generateRecommendationText } from "@/server/generation-adapter";
import { getGenerationApiKey } from "@/server/generation-key";
import { getGenerationMode } from "@/server/generation-mode";
import { generateStoredImage } from "@/server/images";
import { MEAL_IMAGE_MODEL, TEXT_RECOMMENDATION_MODEL } from "@/server/openai/models";
import type { recommendRequestSchema } from "@/server/validation";

function dishImagePrompt(name: string, summary: string) {
  return [
    `Create an appetizing square meal image for "${name}".`,
    summary,
    "Show one finished dish without text, labels, people, or branded packaging."
  ].join(" ");
}

export async function createRecommendation(
  clerkUserId: string,
  input: z.infer<typeof recommendRequestSchema>
) {
  const user = await ensureUser(clerkUserId);
  await reserveGenerationCapacity(clerkUserId, "recommendation");
  const mode = getGenerationMode();
  const fridge = await listFridgeItems(user.id);

  if (fridge.length === 0) {
    throw new BusinessError("FRIDGE_EMPTY");
  }

  const apiKey = await getGenerationApiKey(user.id, mode);
  const preferenceContext = resolveRecommendationContext(await getPreferences(user.id), {
    temporaryRequirement: input.temporaryRequirement
  });
  const result = await generateRecommendationText({
    mode,
    apiKey,
    prompt: buildRecommendationPrompt({
      ...preferenceContext,
      candidateCount: input.candidateCount,
      fridgeItems: fridge
    })
  });

  if (result.dishes.length !== input.candidateCount) {
    throw new BusinessError("MODEL_RESPONSE_INVALID");
  }

  const saved = await saveRecommendation(user.id, {
    locale: preferenceContext.locale,
    textModel: TEXT_RECOMMENDATION_MODEL,
    generationMode: mode,
    dishes: result.dishes
  });
  const persistedDishes = [...saved.dishes].sort((left, right) => left.position - right.position);
  const dishes = await Promise.all(
    result.dishes.map(async (dish, index) => {
      const persistedDish = persistedDishes[index];

      if (!persistedDish) {
        throw new BusinessError("MODEL_RESPONSE_INVALID");
      }

      const image = await generateStoredImage({
        userId: user.id,
        kind: "dish",
        mode,
        apiKey,
        prompt: dishImagePrompt(dish.name, dish.summary),
        attach: (imageId) => attachDishImage(persistedDish.id, imageId)
      });

      return {
        ...persistedDish,
        instructions: persistedDish.instructionsJson,
        consumptions: enrichConsumptionSuggestions(dish.consumptions, fridge),
        image
      };
    })
  );

  return {
    recommendation: saved.recommendation,
    imageModel: MEAL_IMAGE_MODEL,
    dishes
  };
}

export async function retryDishImage(clerkUserId: string, dishId: string) {
  const user = await ensureUser(clerkUserId);
  await reserveGenerationCapacity(clerkUserId, "dish_image_retry");
  const mode = getGenerationMode();
  const apiKey = await getGenerationApiKey(user.id, mode);
  const dish = await getDish(user.id, dishId);

  return generateStoredImage({
    userId: user.id,
    kind: "dish",
    mode,
    apiKey,
    prompt: dishImagePrompt(dish.name, dish.summary),
    attach: (imageId) => attachDishImage(dish.id, imageId)
  });
}
