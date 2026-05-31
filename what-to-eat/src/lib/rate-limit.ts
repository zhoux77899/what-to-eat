export const RECOMMENDATION_WINDOW_SECONDS = 60;
export const RECOMMENDATION_WINDOW_LIMIT = 5;
export const RECOMMENDATION_DAILY_SOFT_LIMIT = 100;

export type RecommendationRateLimitCounts = {
  windowCount: number;
  dailyCount: number;
};

export function getFixedWindowStart(now: Date, windowSeconds: number) {
  const windowMilliseconds = windowSeconds * 1000;
  return new Date(Math.floor(now.getTime() / windowMilliseconds) * windowMilliseconds);
}

export function isRecommendationRateLimited(counts: RecommendationRateLimitCounts) {
  return (
    counts.windowCount >= RECOMMENDATION_WINDOW_LIMIT ||
    counts.dailyCount >= RECOMMENDATION_DAILY_SOFT_LIMIT
  );
}
