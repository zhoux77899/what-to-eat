import type { NextRequest } from "next/server";

import { fail, failFromError, ok } from "@/server/api-response";
import { getCurrentClerkUserId } from "@/server/auth";
import { createRecommendation } from "@/server/recommendation-service";
import { parseJsonBody } from "@/server/request";
import { recommendRequestSchema } from "@/server/validation";

export const maxDuration = 180;

export async function POST(request: NextRequest) {
  const clerkUserId = await getCurrentClerkUserId();

  if (!clerkUserId) {
    return fail("UNAUTHENTICATED");
  }

  const parsed = await parseJsonBody(request, recommendRequestSchema);

  if (!parsed.success) {
    return fail("VALIDATION_ERROR");
  }

  try {
    return ok(await createRecommendation(clerkUserId, parsed.data));
  } catch (error) {
    return failFromError(error);
  }
}
