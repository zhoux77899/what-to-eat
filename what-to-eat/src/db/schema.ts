import {
  boolean,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

import type { FoodPreferences } from "@/lib/preferences";

export const openAiKeyStatus = pgEnum("openai_key_status", [
  "validation_required",
  "valid",
  "invalid"
]);

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
    dietaryRestrictions: jsonb("dietary_restrictions").$type<string[]>().default([]).notNull(),
    dislikedFoods: jsonb("disliked_foods").$type<string[]>().default([]).notNull(),
    budgetLevel: text("budget_level").default("medium").notNull(),
    locationHint: text("location_hint"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userIdIdx: uniqueIndex("preferences_user_id_idx").on(table.userId)
  })
);

export const recommendations = pgTable("recommendations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  textModel: text("text_model").notNull(),
  imageModel: text("image_model"),
  locale: text("locale").notNull(),
  effectivePreferencesJson: jsonb("effective_preferences_json").$type<FoodPreferences>().notNull(),
  inputJson: jsonb("input_json").$type<Record<string, unknown>>().notNull(),
  resultJson: jsonb("result_json").$type<Record<string, unknown>>(),
  imageMetadataJson: jsonb("image_metadata_json").$type<Record<string, unknown>>(),
  imageRequested: boolean("image_requested").default(false).notNull(),
  errorCode: text("error_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const recommendationRateLimits = pgTable(
  "recommendation_rate_limits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkUserId: text("clerk_user_id").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    windowSeconds: integer("window_seconds").notNull(),
    requestCount: integer("request_count").default(0).notNull(),
    dailyDate: date("daily_date").notNull(),
    dailyCount: integer("daily_count").default(0).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    rateLimitWindowIdx: uniqueIndex("recommendation_rate_limits_window_idx").on(
      table.clerkUserId,
      table.windowStart,
      table.dailyDate
    )
  })
);
