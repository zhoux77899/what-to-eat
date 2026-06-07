import "dotenv/config";

import { randomUUID } from "node:crypto";

import { and, eq, inArray } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { createDb } from "@/db";
import { generatedImages, generationRateLimitBuckets, users } from "@/db/schema";
import {
  addFridgeItem,
  applyFridgeConsumption,
  createGeneratedImage,
  ensureUser,
  listFridgeItems,
  listRecommendations,
  reconcileTimedOutGeneratedImages,
  reserveGenerationCapacity,
  saveRecommendation
} from "@/server/data";
import { RECOMMENDATION_WINDOW_LIMIT } from "@/lib/rate-limit";
import {
  IMAGE_GENERATION_STALE_GRACE_MS,
  IMAGE_GENERATION_TIMED_OUT,
  IMAGE_GENERATION_TIMEOUT_MS
} from "@/server/image-lifecycle";

const integrationDatabaseUrl = process.env.INTEGRATION_DATABASE_URL;

if (!integrationDatabaseUrl) {
  throw new Error(
    "INTEGRATION_DATABASE_URL is required for database integration tests. Use an isolated Postgres branch."
  );
}

process.env.DATABASE_URL = integrationDatabaseUrl;

const db = createDb();
const trackedClerkUserIds = new Set<string>();

function nextClerkUserId(label: string) {
  const clerkUserId = `integration-${label}-${randomUUID()}`;
  trackedClerkUserIds.add(clerkUserId);
  return clerkUserId;
}

async function createTestUser(label: string) {
  return ensureUser(nextClerkUserId(label));
}

afterEach(async () => {
  const clerkUserIds = Array.from(trackedClerkUserIds);

  if (clerkUserIds.length > 0) {
    await db
      .delete(generationRateLimitBuckets)
      .where(inArray(generationRateLimitBuckets.clerkUserId, clerkUserIds));
    await db.delete(users).where(inArray(users.clerkUserId, clerkUserIds));
    trackedClerkUserIds.clear();
  }
});

describe("database-backed refrigerator behavior", () => {
  it("merges concurrent fridge inserts through the normalized identity unique index", async () => {
    const user = await createTestUser("fridge-merge");

    await Promise.all(
      Array.from({ length: 10 }, () =>
        addFridgeItem(user.id, {
          name: "  Cherry   Tomato ",
          quantity: 1,
          unit: " Portions "
        })
      )
    );

    const items = await listFridgeItems(user.id);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      name: "  Cherry   Tomato ",
      quantity: 10,
      unit: " Portions ",
      version: 10
    });
  });

  it("rolls back every fridge consumption when any requested row is stale or insufficient", async () => {
    const user = await createTestUser("consumption-rollback");
    const tomato = await addFridgeItem(user.id, {
      name: "Tomato",
      quantity: 2,
      unit: "pieces"
    });
    const spinach = await addFridgeItem(user.id, {
      name: "Spinach",
      quantity: 1,
      unit: "bunch"
    });

    await expect(
      applyFridgeConsumption(user.id, [
        {
          fridgeItemId: tomato.item.id,
          expectedVersion: tomato.item.version - 1,
          consumedQuantity: 1,
          unit: tomato.item.unit
        },
        {
          fridgeItemId: spinach.item.id,
          expectedVersion: spinach.item.version,
          consumedQuantity: 1,
          unit: spinach.item.unit
        }
      ])
    ).rejects.toMatchObject({ code: "FRIDGE_CONFLICT" });

    let itemsByName = new Map((await listFridgeItems(user.id)).map((item) => [item.name, item]));

    expect(itemsByName.get("Tomato")).toMatchObject({ quantity: 2, version: 1 });
    expect(itemsByName.get("Spinach")).toMatchObject({ quantity: 1, version: 1 });

    await expect(
      applyFridgeConsumption(user.id, [
        {
          fridgeItemId: tomato.item.id,
          expectedVersion: tomato.item.version,
          consumedQuantity: 99,
          unit: tomato.item.unit
        },
        {
          fridgeItemId: spinach.item.id,
          expectedVersion: spinach.item.version,
          consumedQuantity: 1,
          unit: spinach.item.unit
        }
      ])
    ).rejects.toMatchObject({ code: "FRIDGE_CONFLICT" });

    itemsByName = new Map((await listFridgeItems(user.id)).map((item) => [item.name, item]));

    expect(itemsByName.get("Tomato")).toMatchObject({ quantity: 2, version: 1 });
    expect(itemsByName.get("Spinach")).toMatchObject({ quantity: 1, version: 1 });
  });

  it("keeps generation bucket increments atomic under concurrent requests", async () => {
    const clerkUserId = nextClerkUserId("bucket-contention");
    const attempts = RECOMMENDATION_WINDOW_LIMIT + 1;

    const results = await Promise.allSettled(
      Array.from({ length: attempts }, () =>
        reserveGenerationCapacity(clerkUserId, "recommendation")
      )
    );
    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(RECOMMENDATION_WINDOW_LIMIT);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]).toMatchObject({
      reason: {
        code: "RATE_LIMITED"
      }
    });
  });

  it("does not spend daily capacity on requests blocked by the minute bucket", async () => {
    const clerkUserId = nextClerkUserId("bucket-minute-before-day");
    const attempts = RECOMMENDATION_WINDOW_LIMIT + 3;

    const results = await Promise.allSettled(
      Array.from({ length: attempts }, () =>
        reserveGenerationCapacity(clerkUserId, "recommendation")
      )
    );
    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(RECOMMENDATION_WINDOW_LIMIT);
    expect(rejected).toHaveLength(attempts - RECOMMENDATION_WINDOW_LIMIT);

    const buckets = await db
      .select({
        bucketType: generationRateLimitBuckets.bucketType,
        requestCount: generationRateLimitBuckets.requestCount
      })
      .from(generationRateLimitBuckets)
      .where(
        and(
          eq(generationRateLimitBuckets.clerkUserId, clerkUserId),
          eq(generationRateLimitBuckets.actionType, "recommendation")
        )
      );

    const dayBucket = buckets.find((bucket) => bucket.bucketType === "day");

    expect(dayBucket?.requestCount).toBe(RECOMMENDATION_WINDOW_LIMIT);
  });

  it("writes lightweight recommendation history without transient request fields", async () => {
    const user = await createTestUser("history");
    const tomato = await addFridgeItem(user.id, {
      name: "Tomato",
      quantity: 2,
      unit: "pieces"
    });

    await saveRecommendation(user.id, {
      locale: "en",
      textModel: "gpt-5.5",
      generationMode: "production_openai",
      dishes: [
        {
          name: "Tomato toast",
          summary: "A quick tomato snack.",
          instructions: ["Toast the bread.", "Top it with tomato."],
          estimatedMinutes: 8,
          consumptions: [
            {
              fridgeItemId: tomato.item.id,
              consumedQuantity: 1,
              unit: tomato.item.unit
            }
          ]
        }
      ]
    });

    const history = await listRecommendations(user.id);

    expect(history).toHaveLength(1);

    const recommendation = history[0]!;
    const dish = recommendation.dishes[0]!;

    expect(recommendation).toMatchObject({
      locale: "en",
      textModel: "gpt-5.5",
      generationMode: "production_openai",
      candidateCount: 1
    });
    expect(dish).toMatchObject({
      name: "Tomato toast",
      summary: "A quick tomato snack.",
      instructions: ["Toast the bread.", "Top it with tomato."],
      estimatedMinutes: 8
    });
    expect(recommendation).not.toHaveProperty("temporaryRequirement");
    expect(recommendation).not.toHaveProperty("preferenceSnapshot");
    expect(recommendation).not.toHaveProperty("fridgeSnapshot");
    expect(dish).not.toHaveProperty("consumptions");
  });

  it("reconciles stale pending generated images as timed out", async () => {
    const user = await createTestUser("image-stale");
    const now = new Date("2026-06-06T02:00:00.000Z");
    const image = await createGeneratedImage(user.id, "dish", "production_openai");

    await db
      .update(generatedImages)
      .set({
        createdAt: new Date(
          now.getTime() - IMAGE_GENERATION_TIMEOUT_MS - IMAGE_GENERATION_STALE_GRACE_MS - 1_000
        )
      })
      .where(eq(generatedImages.id, image.id));

    await reconcileTimedOutGeneratedImages(user.id, now);

    const [updatedImage] = await db
      .select({
        status: generatedImages.status,
        errorCode: generatedImages.errorCode
      })
      .from(generatedImages)
      .where(eq(generatedImages.id, image.id));

    expect(updatedImage).toEqual({
      status: "failed",
      errorCode: IMAGE_GENERATION_TIMED_OUT
    });
  });
});
