import type { NextRequest } from "next/server";

import { fail, failFromError, ok } from "@/server/api-response";
import { getCurrentClerkUserId } from "@/server/auth";
import { removeRecommendedDish } from "@/server/recommendation-service";
import { recordIdSchema } from "@/server/validation";

export const runtime = "nodejs";
export const maxDuration = 300;

type RouteContext = { params: Promise<{ dishId: string }> };

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const clerkUserId = await getCurrentClerkUserId();

  if (!clerkUserId) {
    return fail("UNAUTHENTICATED");
  }

  const dishId = recordIdSchema.safeParse((await context.params).dishId);

  if (!dishId.success) {
    return fail("VALIDATION_ERROR");
  }

  try {
    await removeRecommendedDish(clerkUserId, dishId.data);
    return ok({ deleted: true });
  } catch (error) {
    return failFromError(error);
  }
}
