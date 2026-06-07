import type { z } from "zod";

import { resolveRecommendationContext } from "@/lib/preferences";
import { buildRecommendationPrompt, enrichConsumptionSuggestions } from "@/lib/recommendations";
import { BusinessError } from "@/server/business-error";
import {
  attachDishImage,
  ensureUser,
  getDish,
  getPreferences,
  isDishImageCurrent,
  listFridgeItems,
  reserveGenerationCapacity,
  saveRecommendation
} from "@/server/data";
import { generateRecommendationText } from "@/server/generation-adapter";
import { getGenerationApiKey } from "@/server/generation-key";
import { getGenerationMode } from "@/server/generation-mode";
import { createPendingStoredImage, scheduleStoredImageCompletion } from "@/server/images";
import { buildDishImagePrompt } from "@/server/image-prompts";
import { MEAL_IMAGE_MODEL, TEXT_RECOMMENDATION_MODEL } from "@/server/openai/models";
import type { recommendRequestSchema } from "@/server/validation";

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

      const image = await createPendingStoredImage({
        userId: user.id,
        kind: "dish",
        mode,
        attach: (imageId) => attachDishImage(persistedDish.id, imageId)
      });
      const prompt = buildDishImagePrompt(dish.name, dish.summary);

      scheduleStoredImageCompletion({
        imageId: image.id,
        userId: user.id,
        kind: "dish",
        mode,
        apiKey,
        prompt,
        isCurrent: () => isDishImageCurrent(user.id, persistedDish.id, image.id)
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

  const image = await createPendingStoredImage({
    userId: user.id,
    kind: "dish",
    mode,
    attach: (imageId) => attachDishImage(dish.id, imageId)
  });
  scheduleStoredImageCompletion({
    imageId: image.id,
    userId: user.id,
    kind: "dish",
    mode,
    apiKey,
    prompt: buildDishImagePrompt(dish.name, dish.summary),
    isCurrent: () => isDishImageCurrent(user.id, dish.id, image.id)
  });

  return image;
}
