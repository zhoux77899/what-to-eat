import { describe, expect, it } from "vitest";

import { DEFAULT_PREFERENCES, resolveRecommendationContext } from "@/lib/preferences";

describe("recommendation preference context", () => {
  it("keeps the long-term natural-language preference separate from the temporary requirement", () => {
    const longTerm = {
      locale: "zh",
      preferenceText: "Prefer quick vegetarian meals. Avoid cilantro."
    } as const;

    const result = resolveRecommendationContext(longTerm, {
      locale: "en",
      temporaryRequirement: "Use less oil today."
    });

    expect(result).toEqual({
      locale: "en",
      preferenceText: "Prefer quick vegetarian meals. Avoid cilantro.",
      temporaryRequirement: "Use less oil today."
    });
    expect(longTerm).toEqual({
      locale: "zh",
      preferenceText: "Prefer quick vegetarian meals. Avoid cilantro."
    });
  });

  it("provides an empty natural-language preference by default", () => {
    expect(DEFAULT_PREFERENCES).toEqual({
      locale: "zh",
      preferenceText: ""
    });
  });
});
