import type { NextRequest } from "next/server";

import { DEFAULT_PREFERENCES, mergePreferences } from "@/lib/preferences";
import {
  getFixedWindowStart,
  isRecommendationRateLimited,
  RECOMMENDATION_WINDOW_SECONDS
} from "@/lib/rate-limit";
import { fail } from "@/server/api-response";
import { getCurrentClerkUserId } from "@/server/auth";
import { parseJsonBody } from "@/server/request";
import { recommendRequestSchema } from "@/server/validation";

export async function POST(request: NextRequest) {
  const userId = await getCurrentClerkUserId();

  if (!userId) {
    return fail("UNAUTHENTICATED");
  }

  const parsed = await parseJsonBody(request, recommendRequestSchema);

  if (!parsed.success) {
    return fail("VALIDATION_ERROR");
  }

  const now = new Date();
  const windowStart = getFixedWindowStart(now, RECOMMENDATION_WINDOW_SECONDS);
  const limited = isRecommendationRateLimited({
    windowCount: 0,
    dailyCount: 0
  });

  if (limited) {
    return fail("RATE_LIMITED");
  }

  const effectivePreferences = mergePreferences(
    DEFAULT_PREFERENCES,
    parsed.data.temporaryOverrides
  );
  const rateLimitWindowStartIso = windowStart.toISOString();

  if (!effectivePreferences.effective.locale || !rateLimitWindowStartIso) {
    return fail("VALIDATION_ERROR");
  }

  return fail("MISSING_OPENAI_KEY");
}
