import type { z } from "zod";

import type { FridgeItemInput } from "@/lib/fridge-items";
import { getGenerationMode } from "@/server/generation-mode";
import {
  addFridgeItem,
  applyFridgeConsumption,
  attachFridgeItemImage,
  deleteFridgeItem,
  ensureUser,
  getFridgeItem,
  isFridgeItemImageCurrent,
  listFridgeItems,
  reserveGenerationCapacity,
  updateFridgeItem
} from "@/server/data";
import { getGenerationApiKey } from "@/server/generation-key";
import { createPendingStoredImage, scheduleStoredImageCompletion } from "@/server/images";
import { buildIngredientImagePrompt } from "@/server/image-prompts";
import type { fridgeConsumptionRequestSchema } from "@/server/validation";

async function tryScheduleIngredientImage(input: {
  clerkUserId: string;
  userId: string;
  fridgeItemId: string;
  name: string;
}) {
  const mode = getGenerationMode();
  await reserveGenerationCapacity(input.clerkUserId, "ingredient_image");
  const image = await createPendingStoredImage({
    userId: input.userId,
    kind: "ingredient",
    mode,
    attach: (imageId) => attachFridgeItemImage(input.userId, input.fridgeItemId, imageId)
  });

  scheduleStoredImageCompletion({
    imageId: image.id,
    userId: input.userId,
    kind: "ingredient",
    mode,
    prompt: buildIngredientImagePrompt(input.name),
    isCurrent: () => isFridgeItemImageCurrent(input.userId, input.fridgeItemId, image.id),
    apiKey: await getGenerationApiKey(input.userId, mode).catch(() => undefined)
  });

  return image;
}

export async function getFridge(clerkUserId: string) {
  const user = await ensureUser(clerkUserId);
  return listFridgeItems(user.id);
}

export async function createFridgeItem(clerkUserId: string, input: FridgeItemInput) {
  const user = await ensureUser(clerkUserId);
  const result = await addFridgeItem(user.id, input);

  if (result.shouldGenerateImage) {
    await tryScheduleIngredientImage({
      clerkUserId,
      userId: user.id,
      fridgeItemId: result.item.id,
      name: result.item.name
    }).catch(() => undefined);
  }

  return result.item;
}

export async function editFridgeItem(
  clerkUserId: string,
  fridgeItemId: string,
  input: Partial<FridgeItemInput>
) {
  const user = await ensureUser(clerkUserId);
  const result = await updateFridgeItem(user.id, fridgeItemId, input);

  if (result.shouldGenerateImage) {
    await tryScheduleIngredientImage({
      clerkUserId,
      userId: user.id,
      fridgeItemId: result.item.id,
      name: result.item.name
    }).catch(() => undefined);
  }

  return result.item;
}

export async function removeFridgeItem(clerkUserId: string, fridgeItemId: string) {
  const user = await ensureUser(clerkUserId);
  await deleteFridgeItem(user.id, fridgeItemId);
}

export async function retryFridgeItemImage(clerkUserId: string, fridgeItemId: string) {
  const user = await ensureUser(clerkUserId);
  const item = await getFridgeItem(user.id, fridgeItemId);

  return tryScheduleIngredientImage({
    clerkUserId,
    userId: user.id,
    fridgeItemId: item.id,
    name: item.name
  });
}

export async function confirmFridgeConsumption(
  clerkUserId: string,
  input: z.infer<typeof fridgeConsumptionRequestSchema>
) {
  const user = await ensureUser(clerkUserId);
  return applyFridgeConsumption(user.id, input.consumptions);
}
