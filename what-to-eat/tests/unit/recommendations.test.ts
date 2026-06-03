import { describe, expect, it } from "vitest";

import {
  buildRecommendationPrompt,
  enrichConsumptionSuggestions,
  recommendationResultSchema,
  toPersistedDish
} from "@/lib/recommendations";

describe("recommendation domain model", () => {
  const dish = {
    name: "Tomato scrambled eggs",
    summary: "A quick home-style dish.",
    instructions: ["Beat the eggs.", "Stir-fry with tomatoes."],
    estimatedMinutes: 15,
    consumptions: [
      {
        fridgeItemId: "550e8400-e29b-41d4-a716-446655440000",
        consumedQuantity: 2,
        unit: "pieces"
      }
    ]
  };

  it("validates transient fridge consumption suggestions in model output", () => {
    expect(
      recommendationResultSchema.parse({
        dishes: [dish]
      })
    ).toEqual({
      dishes: [dish]
    });
  });

  it("drops transient consumption suggestions from persisted dish history", () => {
    expect(toPersistedDish(dish)).toEqual({
      name: "Tomato scrambled eggs",
      summary: "A quick home-style dish.",
      instructions: ["Beat the eggs.", "Stir-fry with tomatoes."],
      estimatedMinutes: 15
    });
  });

  it("includes fridge ids and temporary requirements in the prompt without changing storage shape", () => {
    const prompt = buildRecommendationPrompt({
      locale: "en",
      candidateCount: 1,
      preferenceText: "Avoid cilantro.",
      temporaryRequirement: "Cook within 20 minutes.",
      fridgeItems: [
        {
          id: "550e8400-e29b-41d4-a716-446655440000",
          name: "tomato",
          quantity: 2,
          unit: "pieces"
        }
      ]
    });

    expect(prompt).toContain("550e8400-e29b-41d4-a716-446655440000");
    expect(prompt).toContain("Avoid cilantro.");
    expect(prompt).toContain("Cook within 20 minutes.");
    expect(prompt).toContain("Return exactly 1 dish candidate");
  });

  it("adds current versions and drops unsafe model consumption suggestions", () => {
    expect(
      enrichConsumptionSuggestions(
        [
          {
            fridgeItemId: "550e8400-e29b-41d4-a716-446655440000",
            consumedQuantity: 1,
            unit: " pieces "
          },
          {
            fridgeItemId: "550e8400-e29b-41d4-a716-446655440001",
            consumedQuantity: 4,
            unit: "pieces"
          }
        ],
        [
          {
            id: "550e8400-e29b-41d4-a716-446655440000",
            name: "tomato",
            quantity: 2,
            unit: "pieces",
            version: 3
          },
          {
            id: "550e8400-e29b-41d4-a716-446655440001",
            name: "egg",
            quantity: 2,
            unit: "pieces",
            version: 5
          }
        ]
      )
    ).toEqual([
      {
        fridgeItemId: "550e8400-e29b-41d4-a716-446655440000",
        fridgeItemName: "tomato",
        consumedQuantity: 1,
        unit: "pieces",
        expectedVersion: 3
      }
    ]);
  });
});
