import { describe, expect, it } from "vitest";

import {
  FridgeConsumptionConflictError,
  mergeFridgeItemQuantity,
  normalizeFridgeItemIdentity,
  planFridgeConsumption
} from "@/lib/fridge-items";

describe("fridge item inventory rules", () => {
  it("normalizes a user-owned ingredient identity without restricting free-text units", () => {
    expect(normalizeFridgeItemIdentity("  Cherry   Tomato ", "  Portions ")).toEqual({
      normalizedName: "cherry tomato",
      normalizedUnit: "portions"
    });
    expect(normalizeFridgeItemIdentity(" 空心菜 ", " 把 ")).toEqual({
      normalizedName: "空心菜",
      normalizedUnit: "把"
    });
  });

  it("merges quantities for the same normalized ingredient and unit", () => {
    expect(
      mergeFridgeItemQuantity(
        {
          id: "fridge-1",
          name: "Cherry Tomato",
          normalizedName: "cherry tomato",
          quantity: 2,
          unit: "portions",
          normalizedUnit: "portions",
          version: 3
        },
        {
          name: " cherry   tomato ",
          quantity: 1.5,
          unit: " Portions "
        }
      )
    ).toMatchObject({
      quantity: 3.5,
      version: 4
    });
  });

  it("plans updates and deletions together for one confirmed dish", () => {
    const result = planFridgeConsumption(
      [
        {
          id: "fridge-1",
          name: "Tomato",
          normalizedName: "tomato",
          quantity: 2,
          unit: "pieces",
          normalizedUnit: "pieces",
          version: 4
        },
        {
          id: "fridge-2",
          name: "Spinach",
          normalizedName: "spinach",
          quantity: 1,
          unit: "bunch",
          normalizedUnit: "bunch",
          version: 2
        }
      ],
      [
        {
          fridgeItemId: "fridge-1",
          expectedVersion: 4,
          consumedQuantity: 1,
          unit: "pieces"
        },
        {
          fridgeItemId: "fridge-2",
          expectedVersion: 2,
          consumedQuantity: 1,
          unit: "bunch"
        }
      ]
    );

    expect(result).toEqual([
      {
        fridgeItemId: "fridge-1",
        action: "update",
        nextQuantity: 1,
        nextVersion: 5
      },
      {
        fridgeItemId: "fridge-2",
        action: "delete"
      }
    ]);
  });

  it("rejects the whole dish when an inventory version is stale", () => {
    expect(() =>
      planFridgeConsumption(
        [
          {
            id: "fridge-1",
            name: "Tomato",
            normalizedName: "tomato",
            quantity: 2,
            unit: "pieces",
            normalizedUnit: "pieces",
            version: 5
          }
        ],
        [
          {
            fridgeItemId: "fridge-1",
            expectedVersion: 4,
            consumedQuantity: 1,
            unit: "pieces"
          }
        ]
      )
    ).toThrow(FridgeConsumptionConflictError);
  });
});
