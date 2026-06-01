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
  listFridgeItems,
  reserveGenerationCapacity,
  updateFridgeItem
} from "@/server/data";
import { getGenerationApiKey } from "@/server/generation-key";
import { generateStoredImage } from "@/server/images";
import type { fridgeConsumptionRequestSchema } from "@/server/validation";

function ingredientImagePrompt(name: string) {
  return [
    `Create a simple appetizing ingredient reference image of ${name}.`,
    "Show the ingredient type only, without quantity labels, text, packaging, or a prepared dish.",
    "Use a clean neutral background and a square composition."
  ].join(" ");
}

async function tryGenerateIngredientImage(input: {
  clerkUserId: string;
  userId: string;
  fridgeItemId: string;
  name: string;
}) {
  const mode = getGenerationMode();
  await reserveGenerationCapacity(input.clerkUserId, "ingredient_image");
  let apiKey: string | undefined;

  try {
    apiKey = await getGenerationApiKey(input.userId, mode);
  } catch {
    apiKey = undefined;
  }

  return generateStoredImage({
    userId: input.userId,
    kind: "ingredient",
    mode,
    apiKey,
    prompt: ingredientImagePrompt(input.name),
    attach: (imageId) => attachFridgeItemImage(input.userId, input.fridgeItemId, imageId)
  });
}

export async function getFridge(clerkUserId: string) {
  const user = await ensureUser(clerkUserId);
  return listFridgeItems(user.id);
}

export async function createFridgeItem(clerkUserId: string, input: FridgeItemInput) {
  const user = await ensureUser(clerkUserId);
  const result = await addFridgeItem(user.id, input);

  if (result.shouldGenerateImage) {
    await tryGenerateIngredientImage({
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
    await tryGenerateIngredientImage({
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

  return tryGenerateIngredientImage({
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
