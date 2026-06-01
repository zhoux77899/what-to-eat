import {
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const openAiKeyStatus = pgEnum("openai_key_status", [
  "validation_required",
  "valid",
  "invalid"
]);

export const generatedImageKind = pgEnum("generated_image_kind", ["ingredient", "dish"]);

export const generatedImageStatus = pgEnum("generated_image_status", [
  "pending",
  "succeeded",
  "failed"
]);

export const generationMode = pgEnum("generation_mode", [
  "production_openai",
  "local_codex"
]);

export const generationActionType = pgEnum("generation_action_type", [
  "recommendation",
  "ingredient_image",
  "dish_image_retry"
]);

export const rateLimitBucketType = pgEnum("rate_limit_bucket_type", ["minute", "day"]);

export type OpenAiKeyStatus = (typeof openAiKeyStatus.enumValues)[number];
export type GeneratedImageKind = (typeof generatedImageKind.enumValues)[number];
export type GenerationMode = (typeof generationMode.enumValues)[number];
export type GenerationActionType = (typeof generationActionType.enumValues)[number];

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkUserId: text("clerk_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    clerkUserIdIdx: uniqueIndex("users_clerk_user_id_idx").on(table.clerkUserId)
  })
);

export const userOpenAiKeys = pgTable(
  "user_openai_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    encryptedApiKey: text("encrypted_api_key").notNull(),
    keyHint: text("key_hint").notNull(),
    status: openAiKeyStatus("status").default("validation_required").notNull(),
    lastValidatedAt: timestamp("last_validated_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userIdIdx: uniqueIndex("user_openai_keys_user_id_idx").on(table.userId)
  })
);

export const preferences = pgTable(
  "preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    locale: text("locale").default("zh").notNull(),
    preferenceText: text("preference_text").default("").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userIdIdx: uniqueIndex("preferences_user_id_idx").on(table.userId)
  })
);

export const generatedImages = pgTable("generated_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  kind: generatedImageKind("kind").notNull(),
  status: generatedImageStatus("status").default("pending").notNull(),
  model: text("model").notNull(),
  generationMode: generationMode("generation_mode").notNull(),
  blobPathname: text("blob_pathname"),
  publicUrl: text("public_url"),
  errorCode: text("error_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const fridgeItems = pgTable(
  "fridge_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 3, mode: "number" }).notNull(),
    unit: text("unit").notNull(),
    normalizedUnit: text("normalized_unit").notNull(),
    imageId: uuid("image_id").references(() => generatedImages.id, { onDelete: "set null" }),
    version: integer("version").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    positiveQuantity: check("fridge_items_positive_quantity", sql`${table.quantity} > 0`),
    userIngredientUnitIdx: uniqueIndex("fridge_items_user_ingredient_unit_idx").on(
      table.userId,
      table.normalizedName,
      table.normalizedUnit
    )
  })
);

export const recommendations = pgTable(
  "recommendations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    textModel: text("text_model").notNull(),
    generationMode: generationMode("generation_mode").notNull(),
    candidateCount: integer("candidate_count").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    candidateCountRange: check(
      "recommendations_candidate_count_range",
      sql`${table.candidateCount} between 1 and 5`
    ),
    userCreatedAtIdx: index("recommendations_user_created_at_idx").on(
      table.userId,
      table.createdAt
    )
  })
);

export const recommendedDishes = pgTable(
  "recommended_dishes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recommendationId: uuid("recommendation_id")
      .notNull()
      .references(() => recommendations.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    name: text("name").notNull(),
    summary: text("summary").notNull(),
    instructionsJson: jsonb("instructions_json").$type<string[]>().notNull(),
    estimatedMinutes: integer("estimated_minutes").notNull(),
    imageId: uuid("image_id").references(() => generatedImages.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    recommendationPositionIdx: uniqueIndex("recommended_dishes_recommendation_position_idx").on(
      table.recommendationId,
      table.position
    )
  })
);

export const generationRateLimitBuckets = pgTable(
  "generation_rate_limit_buckets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkUserId: text("clerk_user_id").notNull(),
    actionType: generationActionType("action_type").notNull(),
    bucketType: rateLimitBucketType("bucket_type").notNull(),
    bucketStart: timestamp("bucket_start", { withTimezone: true }).notNull(),
    requestCount: integer("request_count").default(0).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    generationBucketIdx: uniqueIndex("generation_rate_limit_buckets_scope_idx").on(
      table.clerkUserId,
      table.actionType,
      table.bucketType,
      table.bucketStart
    )
  })
);
