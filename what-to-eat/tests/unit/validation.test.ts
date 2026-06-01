import { describe, expect, it } from "vitest";

import {
  fridgeConsumptionRequestSchema,
  fridgeItemSchema,
  preferencesSchema,
  recommendRequestSchema
} from "@/server/validation";

describe("fridge recommendation request validation", () => {
  it("accepts positive numeric quantities with free-text units", () => {
    expect(
      fridgeItemSchema.parse({
        name: "空心菜",
        quantity: 1,
        unit: "把"
      })
    ).toEqual({
      name: "空心菜",
      quantity: 1,
      unit: "把"
    });
  });

  it("restricts one recommendation request to between one and five dishes", () => {
    expect(recommendRequestSchema.parse({ candidateCount: 5 })).toEqual({
      candidateCount: 5,
      temporaryRequirement: null
    });
    expect(() => recommendRequestSchema.parse({ candidateCount: 0 })).toThrow();
    expect(() => recommendRequestSchema.parse({ candidateCount: 6 })).toThrow();
  });

  it("stores long-term preferences as one natural-language field", () => {
    expect(
      preferencesSchema.parse({
        locale: "zh",
        preferenceText: "少辣，不吃香菜"
      })
    ).toEqual({
      locale: "zh",
      preferenceText: "少辣，不吃香菜"
    });
  });

  it("requires optimistic concurrency data when confirming dish consumption", () => {
    expect(
      fridgeConsumptionRequestSchema.parse({
        consumptions: [
          {
            fridgeItemId: "4f125f7e-ff0d-4a1f-9194-24de7c55f605",
            expectedVersion: 2,
            consumedQuantity: 1,
            unit: "个"
          }
        ]
      })
    ).toMatchObject({
      consumptions: [
        {
          expectedVersion: 2,
          consumedQuantity: 1
        }
      ]
    });
  });
});
