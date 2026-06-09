import { randomUUID } from "node:crypto";

import { and, desc, eq, lt, ne, sql } from "drizzle-orm";

import {
  fridgeItems,
  generatedImages,
  generationRateLimitBuckets,
  preferences,
  recommendations,
  recommendedDishes,
  userOpenAiKeys,
  users,
  type GenerationActionType,
  type GenerationMode,
  type GeneratedImageKind,
  type OpenAiKeyStatus
} from "@/db/schema";
import { createDb } from "@/db";
import {
  normalizeFridgeItemIdentity,
  shouldRegenerateFridgeItemImage,
  type FridgeConsumptionInput,
  type FridgeItemInput
} from "@/lib/fridge-items";
import { DEFAULT_PREFERENCES, type FoodPreferences } from "@/lib/preferences";
import { toPersistedDish, type RecommendedDishResult } from "@/lib/recommendations";
import {
  getFixedWindowStart,
  RECOMMENDATION_DAILY_SOFT_LIMIT,
  RECOMMENDATION_WINDOW_LIMIT,
  RECOMMENDATION_WINDOW_SECONDS
} from "@/lib/rate-limit";
import { BusinessError } from "@/server/business-error";
import {
  getImageDeadlineAt,
  getTimedOutImageCutoff,
  IMAGE_GENERATION_TIMED_OUT
} from "@/server/image-lifecycle";

export async function ensureUser(clerkUserId: string) {
  const db = createDb();
  const [user] = await db
    .insert(users)
    .values({ clerkUserId })
    .onConflictDoUpdate({
      target: users.clerkUserId,
      set: { updatedAt: new Date() }
    })
    .returning();

  return user;
}

export async function getPreferences(userId: string): Promise<FoodPreferences> {
  const db = createDb();
  const [record] = await db.select().from(preferences).where(eq(preferences.userId, userId));

  if (!record) {
    return DEFAULT_PREFERENCES;
  }

  return {
    locale: record.locale === "en" ? "en" : "zh",
    preferenceText: record.preferenceText
  };
}

export async function savePreferences(userId: string, value: FoodPreferences) {
  const db = createDb();
  const [record] = await db
    .insert(preferences)
    .values({ userId, ...value })
    .onConflictDoUpdate({
      target: preferences.userId,
      set: {
        ...value,
        updatedAt: new Date()
      }
    })
    .returning();

  return record;
}

export async function getOpenAiKey(userId: string) {
  const db = createDb();
  const [record] = await db.select().from(userOpenAiKeys).where(eq(userOpenAiKeys.userId, userId));
  return record ?? null;
}

export async function saveOpenAiKey(
  userId: string,
  value: { encryptedApiKey: string; keyHint: string }
) {
  const db = createDb();
  const [record] = await db
    .insert(userOpenAiKeys)
    .values({
      userId,
      ...value,
      status: "validation_required"
    })
    .onConflictDoUpdate({
      target: userOpenAiKeys.userId,
      set: {
        ...value,
        status: "validation_required",
        lastValidatedAt: null,
        updatedAt: new Date()
      }
    })
    .returning();

  return record;
}

export async function deleteOpenAiKey(userId: string) {
  const db = createDb();
  await db.delete(userOpenAiKeys).where(eq(userOpenAiKeys.userId, userId));
}

export async function setOpenAiKeyStatus(userId: string, status: OpenAiKeyStatus) {
  const db = createDb();
  const [record] = await db
    .update(userOpenAiKeys)
    .set({
      status,
      lastValidatedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(userOpenAiKeys.userId, userId))
    .returning();

  return record ?? null;
}

export async function touchOpenAiKeyLastUsed(userId: string) {
  const db = createDb();
  await db
    .update(userOpenAiKeys)
    .set({
      lastUsedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(userOpenAiKeys.userId, userId));
}

export async function listFridgeItems(userId: string) {
  await reconcileTimedOutGeneratedImages(userId);

  const db = createDb();
  const rows = await db
    .select({
      id: fridgeItems.id,
      name: fridgeItems.name,
      quantity: fridgeItems.quantity,
      unit: fridgeItems.unit,
      version: fridgeItems.version,
      imageId: fridgeItems.imageId,
      imageStatus: generatedImages.status,
      imageUrl: generatedImages.publicUrl,
      imageErrorCode: generatedImages.errorCode,
      imageCreatedAt: generatedImages.createdAt,
      updatedAt: fridgeItems.updatedAt
    })
    .from(fridgeItems)
    .leftJoin(generatedImages, eq(fridgeItems.imageId, generatedImages.id))
    .where(eq(fridgeItems.userId, userId))
    .orderBy(desc(fridgeItems.updatedAt));

  return rows.map(({ imageCreatedAt, ...row }) => ({
    ...row,
    imageDeadlineAt: getImageDeadlineAt({
      status: row.imageStatus,
      createdAt: imageCreatedAt
    })
  }));
}

export async function addFridgeItem(userId: string, input: FridgeItemInput) {
  const db = createDb();
  const normalized = normalizeFridgeItemIdentity(input.name, input.unit);
  const [current] = await db
    .select()
    .from(fridgeItems)
    .where(
      and(
        eq(fridgeItems.userId, userId),
        eq(fridgeItems.normalizedName, normalized.normalizedName),
        eq(fridgeItems.normalizedUnit, normalized.normalizedUnit)
      )
    );

  const [item] = await db
    .insert(fridgeItems)
    .values({
      userId,
      ...input,
      ...normalized
    })
    .onConflictDoUpdate({
      target: [fridgeItems.userId, fridgeItems.normalizedName, fridgeItems.normalizedUnit],
      set: {
        quantity: sql`${fridgeItems.quantity} + ${input.quantity}`,
        version: sql`${fridgeItems.version} + 1`,
        updatedAt: new Date()
      }
    })
    .returning();

  return { item, shouldGenerateImage: !current };
}

export async function updateFridgeItem(
  userId: string,
  fridgeItemId: string,
  input: Partial<FridgeItemInput>
) {
  const db = createDb();
  const [current] = await db
    .select()
    .from(fridgeItems)
    .where(and(eq(fridgeItems.id, fridgeItemId), eq(fridgeItems.userId, userId)));

  if (!current) {
    throw new BusinessError("FRIDGE_ITEM_NOT_FOUND");
  }

  const name = input.name ?? current.name;
  const unit = input.unit ?? current.unit;
  const normalized = normalizeFridgeItemIdentity(name, unit);
  const regenerateImage = shouldRegenerateFridgeItemImage(current.name, name);
  const [matching] = await db
    .select()
    .from(fridgeItems)
    .where(
      and(
        eq(fridgeItems.userId, userId),
        eq(fridgeItems.normalizedName, normalized.normalizedName),
        eq(fridgeItems.normalizedUnit, normalized.normalizedUnit),
        ne(fridgeItems.id, fridgeItemId)
      )
    );

  if (matching) {
    const [mergedRows] = await db.batch([
      db
        .update(fridgeItems)
        .set({
          quantity: sql`${fridgeItems.quantity} + ${input.quantity ?? current.quantity}`,
          version: sql`${fridgeItems.version} + 1`,
          updatedAt: new Date()
        })
        .where(and(eq(fridgeItems.id, matching.id), eq(fridgeItems.userId, userId)))
        .returning(),
      db
        .delete(fridgeItems)
        .where(and(eq(fridgeItems.id, fridgeItemId), eq(fridgeItems.userId, userId)))
    ]);

    return {
      item: mergedRows[0],
      shouldGenerateImage: false
    };
  }

  const [item] = await db
    .update(fridgeItems)
    .set({
      ...input,
      ...normalized,
      imageId: regenerateImage ? null : current.imageId,
      version: sql`${fridgeItems.version} + 1`,
      updatedAt: new Date()
    })
    .where(and(eq(fridgeItems.id, fridgeItemId), eq(fridgeItems.userId, userId)))
    .returning();

  return {
    item,
    shouldGenerateImage: regenerateImage
  };
}

export async function deleteFridgeItem(userId: string, fridgeItemId: string) {
  const db = createDb();
  const [deleted] = await db
    .delete(fridgeItems)
    .where(and(eq(fridgeItems.id, fridgeItemId), eq(fridgeItems.userId, userId)))
    .returning({ id: fridgeItems.id });

  if (!deleted) {
    throw new BusinessError("FRIDGE_ITEM_NOT_FOUND");
  }
}

export async function getFridgeItem(userId: string, fridgeItemId: string) {
  const db = createDb();
  const [item] = await db
    .select()
    .from(fridgeItems)
    .where(and(eq(fridgeItems.id, fridgeItemId), eq(fridgeItems.userId, userId)));

  if (!item) {
    throw new BusinessError("FRIDGE_ITEM_NOT_FOUND");
  }

  return item;
}

export async function createGeneratedImage(
  userId: string,
  kind: GeneratedImageKind,
  generationMode: GenerationMode
) {
  const db = createDb();
  const [image] = await db
    .insert(generatedImages)
    .values({
      userId,
      kind,
      generationMode,
      model: "gpt-image-2"
    })
    .returning();

  return image;
}

export async function reconcileTimedOutGeneratedImages(userId: string, now = new Date()) {
  const db = createDb();

  await db
    .update(generatedImages)
    .set({
      status: "failed",
      errorCode: IMAGE_GENERATION_TIMED_OUT,
      updatedAt: now
    })
    .where(
      and(
        eq(generatedImages.userId, userId),
        eq(generatedImages.status, "pending"),
        lt(generatedImages.createdAt, getTimedOutImageCutoff(now))
      )
    );
}

export async function markGeneratedImageSucceeded(
  imageId: string,
  value: { blobPathname: string; publicUrl: string }
) {
  const db = createDb();
  const [image] = await db
    .update(generatedImages)
    .set({
      status: "succeeded",
      ...value,
      errorCode: null,
      updatedAt: new Date()
    })
    .where(and(eq(generatedImages.id, imageId), eq(generatedImages.status, "pending")))
    .returning();

  return image ?? null;
}

export async function markGeneratedImageFailed(imageId: string, errorCode: string) {
  const db = createDb();
  const [image] = await db
    .update(generatedImages)
    .set({
      status: "failed",
      errorCode,
      updatedAt: new Date()
    })
    .where(and(eq(generatedImages.id, imageId), eq(generatedImages.status, "pending")))
    .returning();

  return image ?? null;
}

export async function attachFridgeItemImage(userId: string, fridgeItemId: string, imageId: string) {
  const db = createDb();
  await db
    .update(fridgeItems)
    .set({
      imageId,
      updatedAt: new Date()
    })
    .where(and(eq(fridgeItems.id, fridgeItemId), eq(fridgeItems.userId, userId)));
}

export async function isFridgeItemImageCurrent(
  userId: string,
  fridgeItemId: string,
  imageId: string
) {
  const db = createDb();
  const [item] = await db
    .select({ id: fridgeItems.id })
    .from(fridgeItems)
    .where(
      and(
        eq(fridgeItems.id, fridgeItemId),
        eq(fridgeItems.userId, userId),
        eq(fridgeItems.imageId, imageId)
      )
    );

  return Boolean(item);
}

export async function attachDishImage(dishId: string, imageId: string) {
  const db = createDb();
  await db.update(recommendedDishes).set({ imageId }).where(eq(recommendedDishes.id, dishId));
}

export async function isDishImageCurrent(userId: string, dishId: string, imageId: string) {
  const db = createDb();
  const [dish] = await db
    .select({ id: recommendedDishes.id })
    .from(recommendedDishes)
    .innerJoin(recommendations, eq(recommendedDishes.recommendationId, recommendations.id))
    .where(
      and(
        eq(recommendedDishes.id, dishId),
        eq(recommendations.userId, userId),
        eq(recommendedDishes.imageId, imageId)
      )
    );

  return Boolean(dish);
}

export async function getDish(userId: string, dishId: string) {
  const db = createDb();
  const [dish] = await db
    .select({
      id: recommendedDishes.id,
      name: recommendedDishes.name,
      summary: recommendedDishes.summary
    })
    .from(recommendedDishes)
    .innerJoin(recommendations, eq(recommendedDishes.recommendationId, recommendations.id))
    .where(and(eq(recommendedDishes.id, dishId), eq(recommendations.userId, userId)));

  if (!dish) {
    throw new BusinessError("DISH_NOT_FOUND");
  }

  return dish;
}

export async function saveRecommendation(
  userId: string,
  value: {
    locale: string;
    textModel: string;
    generationMode: GenerationMode;
    dishes: RecommendedDishResult[];
  }
) {
  const db = createDb();
  const recommendationId = randomUUID();
  const dishValues = value.dishes.map((dish, index) => {
    const persistedDish = toPersistedDish(dish);

    return {
      recommendationId,
      position: index + 1,
      name: persistedDish.name,
      summary: persistedDish.summary,
      instructionsJson: persistedDish.instructions,
      estimatedMinutes: persistedDish.estimatedMinutes
    };
  });
  const [recommendationRows, dishes] = await db.batch([
    db.insert(recommendations)
      .values({
        id: recommendationId,
        userId,
        locale: value.locale,
        textModel: value.textModel,
        generationMode: value.generationMode,
        candidateCount: value.dishes.length
      })
      .returning(),
    db.insert(recommendedDishes).values(dishValues).returning()
  ]);

  return { recommendation: recommendationRows[0], dishes };
}

type DeletedHistoryImages = {
  deletedCount: number;
  remainingCount?: number;
  blobPathnames: string[];
};

function toDeletedHistoryImages(
  rows: Array<{
    deleted_count?: number | string | null;
    remaining_count?: number | string | null;
    blob_pathname?: string | null;
  }>
): DeletedHistoryImages {
  const first = rows[0];

  return {
    deletedCount: Number(first?.deleted_count ?? 0),
    remainingCount:
      first?.remaining_count === undefined || first.remaining_count === null
        ? undefined
        : Number(first.remaining_count),
    blobPathnames: rows
      .map((row) => row.blob_pathname)
      .filter((pathname): pathname is string => Boolean(pathname))
  };
}

export async function deleteRecommendation(userId: string, recommendationId: string) {
  const db = createDb();
  const result = await db.execute<{
    deleted_count: number;
    blob_pathname: string | null;
  }>(sql`
    with target_recommendation as (
      select id
      from recommendations
      where id = ${recommendationId}::uuid
        and user_id = ${userId}::uuid
      for update
    ),
    target_dishes as (
      select id, image_id
      from recommended_dishes
      where recommendation_id in (select id from target_recommendation)
    ),
    image_candidates as (
      select image_id
      from target_dishes
      where image_id is not null
    ),
    deleted_dishes as (
      delete from recommended_dishes
      using target_dishes
      where recommended_dishes.id = target_dishes.id
      returning recommended_dishes.id
    ),
    deleted_recommendation as (
      delete from recommendations
      using target_recommendation
      where recommendations.id = target_recommendation.id
      returning recommendations.id
    ),
    deleted_images as (
      delete from generated_images
      using image_candidates
      where generated_images.id = image_candidates.image_id
        and generated_images.user_id = ${userId}::uuid
        and generated_images.kind = 'dish'
        and (select count(*) from deleted_dishes) >= 0
        and not exists (
          select 1
          from recommended_dishes
          where recommended_dishes.image_id = generated_images.id
        )
      returning generated_images.blob_pathname
    )
    select
      (select count(*) from deleted_recommendation)::integer as deleted_count,
      deleted_images.blob_pathname
    from deleted_images
    union all
    select
      (select count(*) from deleted_recommendation)::integer as deleted_count,
      null::text as blob_pathname
    where not exists (select 1 from deleted_images)
  `);
  const summary = toDeletedHistoryImages(result.rows);

  if (summary.deletedCount !== 1) {
    throw new BusinessError("RECOMMENDATION_NOT_FOUND");
  }

  return { blobPathnames: summary.blobPathnames };
}

export async function deleteRecommendedDish(userId: string, dishId: string) {
  const db = createDb();
  const result = await db.execute<{
    deleted_count: number;
    remaining_count: number;
    blob_pathname: string | null;
  }>(sql`
    with target_dish as (
      select
        recommended_dishes.id,
        recommended_dishes.recommendation_id,
        recommended_dishes.image_id
      from recommended_dishes
      join recommendations
        on recommendations.id = recommended_dishes.recommendation_id
      where recommended_dishes.id = ${dishId}::uuid
        and recommendations.user_id = ${userId}::uuid
      for update of recommendations
    ),
    deleted_dish as (
      delete from recommended_dishes
      using target_dish
      where recommended_dishes.id = target_dish.id
      returning target_dish.recommendation_id, target_dish.image_id
    ),
    remaining as (
      select
        deleted_dish.recommendation_id,
        count(recommended_dishes.id)::integer as remaining_count
      from deleted_dish
      left join recommended_dishes
        on recommended_dishes.recommendation_id = deleted_dish.recommendation_id
      group by deleted_dish.recommendation_id
    ),
    updated_recommendation as (
      update recommendations
      set candidate_count = remaining.remaining_count
      from remaining
      where recommendations.id = remaining.recommendation_id
        and remaining.remaining_count > 0
      returning recommendations.id
    ),
    deleted_recommendation as (
      delete from recommendations
      using remaining
      where recommendations.id = remaining.recommendation_id
        and remaining.remaining_count = 0
      returning recommendations.id
    ),
    deleted_images as (
      delete from generated_images
      using deleted_dish
      where generated_images.id = deleted_dish.image_id
        and generated_images.user_id = ${userId}::uuid
        and generated_images.kind = 'dish'
        and (
          (select count(*) from updated_recommendation)
          + (select count(*) from deleted_recommendation)
        ) >= 0
        and not exists (
          select 1
          from recommended_dishes
          where recommended_dishes.image_id = generated_images.id
        )
      returning generated_images.blob_pathname
    )
    select
      (select count(*) from deleted_dish)::integer as deleted_count,
      coalesce((select remaining_count from remaining), 0)::integer as remaining_count,
      deleted_images.blob_pathname
    from deleted_images
    union all
    select
      (select count(*) from deleted_dish)::integer as deleted_count,
      coalesce((select remaining_count from remaining), 0)::integer as remaining_count,
      null::text as blob_pathname
    where not exists (select 1 from deleted_images)
  `);
  const summary = toDeletedHistoryImages(result.rows);

  if (summary.deletedCount !== 1) {
    throw new BusinessError("DISH_NOT_FOUND");
  }

  return {
    blobPathnames: summary.blobPathnames,
    remainingCount: summary.remainingCount ?? 0
  };
}

export async function listRecommendations(userId: string) {
  await reconcileTimedOutGeneratedImages(userId);

  const db = createDb();
  const recommendationRows = await db
    .select()
    .from(recommendations)
    .where(eq(recommendations.userId, userId))
    .orderBy(desc(recommendations.createdAt));
  const dishRows = await db
    .select({
      id: recommendedDishes.id,
      recommendationId: recommendedDishes.recommendationId,
      position: recommendedDishes.position,
      name: recommendedDishes.name,
      summary: recommendedDishes.summary,
      instructions: recommendedDishes.instructionsJson,
      estimatedMinutes: recommendedDishes.estimatedMinutes,
      imageId: recommendedDishes.imageId,
      imageStatus: generatedImages.status,
      imageUrl: generatedImages.publicUrl,
      imageErrorCode: generatedImages.errorCode,
      imageCreatedAt: generatedImages.createdAt
    })
    .from(recommendedDishes)
    .leftJoin(generatedImages, eq(recommendedDishes.imageId, generatedImages.id))
    .where(
      sql`${recommendedDishes.recommendationId} in (
        select ${recommendations.id}
        from ${recommendations}
        where ${recommendations.userId} = ${userId}
      )`
    );

  return recommendationRows.map((recommendation) => ({
    ...recommendation,
    dishes: dishRows
      .filter((dish) => dish.recommendationId === recommendation.id)
      .sort((left, right) => left.position - right.position)
      .map(({ imageCreatedAt, ...dish }) => ({
        ...dish,
        imageDeadlineAt: getImageDeadlineAt({
          status: dish.imageStatus,
          createdAt: imageCreatedAt
        })
      }))
  }));
}

export async function applyFridgeConsumption(
  userId: string,
  consumptions: FridgeConsumptionInput[]
) {
  const db = createDb();
  const normalizedConsumptions = consumptions.map((consumption) => ({
    fridgeItemId: consumption.fridgeItemId,
    expectedVersion: consumption.expectedVersion,
    consumedQuantity: consumption.consumedQuantity,
    normalizedUnit: normalizeFridgeItemIdentity("", consumption.unit).normalizedUnit
  }));
  const result = await db.execute<{
    requested_count: number;
    valid_count: number;
    unique_count: number;
    applied_count: number;
  }>(sql`
    with requested as (
      select *
      from jsonb_to_recordset(${JSON.stringify(normalizedConsumptions)}::jsonb)
        as item(
          "fridgeItemId" uuid,
          "expectedVersion" integer,
          "consumedQuantity" numeric,
          "normalizedUnit" text
        )
    ),
    validated as (
      select fridge_items.id, requested."consumedQuantity"
      from requested
      join fridge_items on fridge_items.id = requested."fridgeItemId"
      where fridge_items.user_id = ${userId}::uuid
        and fridge_items.version = requested."expectedVersion"
        and fridge_items.normalized_unit = requested."normalizedUnit"
        and requested."consumedQuantity" > 0
        and fridge_items.quantity >= requested."consumedQuantity"
      for update of fridge_items
    ),
    validation as (
      select
        (select count(*) from requested)::integer as requested_count,
        (select count(*) from validated)::integer as valid_count,
        (select count(distinct "fridgeItemId") from requested)::integer as unique_count
    ),
    updated as (
      update fridge_items
      set
        quantity = fridge_items.quantity - validated."consumedQuantity",
        version = fridge_items.version + 1,
        updated_at = now()
      from validated, validation
      where fridge_items.id = validated.id
        and fridge_items.quantity > validated."consumedQuantity"
        and validation.requested_count = validation.valid_count
        and validation.requested_count = validation.unique_count
      returning fridge_items.id
    ),
    deleted as (
      delete from fridge_items
      using validated, validation
      where fridge_items.id = validated.id
        and fridge_items.quantity = validated."consumedQuantity"
        and validation.requested_count = validation.valid_count
        and validation.requested_count = validation.unique_count
      returning fridge_items.id
    )
    select
      requested_count,
      valid_count,
      unique_count,
      ((select count(*) from updated) + (select count(*) from deleted))::integer as applied_count
    from validation
  `);
  const row = result.rows[0];

  const requestedCount = Number(row?.requested_count ?? -1);
  const appliedCount = Number(row?.applied_count ?? -1);

  if (requestedCount !== appliedCount) {
    throw new BusinessError("FRIDGE_CONFLICT");
  }

  return { appliedCount };
}

export async function reserveGenerationCapacity(
  clerkUserId: string,
  actionType: GenerationActionType
) {
  const db = createDb();
  const now = new Date();
  const minuteStart = getFixedWindowStart(now, RECOMMENDATION_WINDOW_SECONDS);
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const increment = async (bucketType: "minute" | "day", bucketStart: Date) => {
    const [bucket] = await db
      .insert(generationRateLimitBuckets)
      .values({
        clerkUserId,
        actionType,
        bucketType,
        bucketStart,
        requestCount: 1
      })
      .onConflictDoUpdate({
        target: [
          generationRateLimitBuckets.clerkUserId,
          generationRateLimitBuckets.actionType,
          generationRateLimitBuckets.bucketType,
          generationRateLimitBuckets.bucketStart
        ],
        set: {
          requestCount: sql`${generationRateLimitBuckets.requestCount} + 1`,
          updatedAt: now
        }
      })
      .returning({ requestCount: generationRateLimitBuckets.requestCount });

    return bucket.requestCount;
  };

  const minuteCount = await increment("minute", minuteStart);

  if (minuteCount > RECOMMENDATION_WINDOW_LIMIT) {
    throw new BusinessError("RATE_LIMITED");
  }

  const dailyCount = await increment("day", dayStart);

  if (dailyCount > RECOMMENDATION_DAILY_SOFT_LIMIT) {
    throw new BusinessError("RATE_LIMITED");
  }
}
