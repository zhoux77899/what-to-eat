import { describe, expect, it } from "vitest";

import {
  RECOMMENDATION_DAILY_SOFT_LIMIT,
  RECOMMENDATION_WINDOW_LIMIT,
  getFixedWindowStart,
  isRecommendationRateLimited
} from "@/lib/rate-limit";

describe("recommendation rate limits", () => {
  it("uses a one-minute fixed window with five allowed recommendation requests", () => {
    const now = new Date("2026-05-17T12:34:56.789Z");

    expect(getFixedWindowStart(now, 60).toISOString()).toBe("2026-05-17T12:34:00.000Z");
    expect(RECOMMENDATION_WINDOW_LIMIT).toBe(5);
    expect(isRecommendationRateLimited({ windowCount: 5, dailyCount: 0 })).toBe(true);
    expect(isRecommendationRateLimited({ windowCount: 4, dailyCount: 0 })).toBe(false);
  });

  it("also enforces the daily soft limit before a model key can be consumed", () => {
    expect(RECOMMENDATION_DAILY_SOFT_LIMIT).toBe(100);
    expect(isRecommendationRateLimited({ windowCount: 0, dailyCount: 100 })).toBe(true);
  });
});
