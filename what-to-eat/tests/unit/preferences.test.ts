import { describe, expect, it } from "vitest";

import { mergePreferences } from "@/lib/preferences";

describe("preference merging", () => {
  it("keeps long-term preferences separate while applying temporary overrides to the effective snapshot", () => {
    const longTerm = {
      locale: "zh",
      dietaryRestrictions: ["vegetarian"],
      dislikedFoods: ["cilantro"],
      budgetLevel: "medium",
      locationHint: "Shanghai"
    } as const;

    const temporary = {
      locale: "en",
      dislikedFoods: ["cilantro", "peanut"],
      budgetLevel: "low"
    } as const;

    const result = mergePreferences(longTerm, temporary);

    expect(result.effective).toEqual({
      locale: "en",
      dietaryRestrictions: ["vegetarian"],
      dislikedFoods: ["cilantro", "peanut"],
      budgetLevel: "low",
      locationHint: "Shanghai"
    });
    expect(result.longTerm).toEqual(longTerm);
  });
});
