import type { NextRequest } from "next/server";

import { fail, failFromError, ok } from "@/server/api-response";
import { getCurrentClerkUserId } from "@/server/auth";
import { removeRecommendation } from "@/server/recommendation-service";
import { recordIdSchema } from "@/server/validation";

export const runtime = "nodejs";
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const clerkUserId = await getCurrentClerkUserId();

  if (!clerkUserId) {
    return fail("UNAUTHENTICATED");
  }

  const recommendationId = recordIdSchema.safeParse((await context.params).id);

  if (!recommendationId.success) {
    return fail("VALIDATION_ERROR");
  }

  try {
    await removeRecommendation(clerkUserId, recommendationId.data);
    return ok({ deleted: true });
  } catch (error) {
    return failFromError(error);
  }
}
