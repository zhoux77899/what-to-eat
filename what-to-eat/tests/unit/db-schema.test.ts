import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";

import {
  fridgeItems,
  generatedImages,
  generationRateLimitBuckets,
  preferences,
  recommendations,
  recommendedDishes
} from "@/db/schema";

function getColumnNames(table: Parameters<typeof getTableConfig>[0]) {
  return getTableConfig(table).columns.map((column) => column.name);
}

describe("fridge recommendation database schema", () => {
  it("stores long-term preferences as natural language", () => {
    expect(getColumnNames(preferences)).toEqual([
      "id",
      "user_id",
      "locale",
      "preference_text",
      "created_at",
      "updated_at"
    ]);
  });

  it("stores current fridge inventory separately from generated image assets", () => {
    expect(getColumnNames(fridgeItems)).toContain("normalized_name");
    expect(getColumnNames(fridgeItems)).toContain("normalized_unit");
    expect(getColumnNames(fridgeItems)).toContain("version");
    expect(getColumnNames(generatedImages)).toContain("blob_pathname");
    expect(getColumnNames(generatedImages)).toContain("public_url");
  });

  it("keeps lightweight history without persisted prompts or consumption drafts", () => {
    expect(getColumnNames(recommendations)).toEqual([
      "id",
      "user_id",
      "locale",
      "text_model",
      "generation_mode",
      "candidate_count",
      "created_at"
    ]);
    expect(getColumnNames(recommendedDishes)).toContain("instructions_json");
  });

  it("uses scoped generation buckets instead of mixed minute and daily columns", () => {
    expect(getColumnNames(generationRateLimitBuckets)).toEqual([
      "id",
      "clerk_user_id",
      "action_type",
      "bucket_type",
      "bucket_start",
      "request_count",
      "updated_at"
    ]);
  });
});
