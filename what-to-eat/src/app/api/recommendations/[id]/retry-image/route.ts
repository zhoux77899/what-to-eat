import { fail, failFromError, ok } from "@/server/api-response";
import { getCurrentClerkUserId } from "@/server/auth";
import { retryDishImage } from "@/server/recommendation-service";
import { recordIdSchema } from "@/server/validation";

export const runtime = "nodejs";
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const clerkUserId = await getCurrentClerkUserId();

  if (!clerkUserId) {
    return fail("UNAUTHENTICATED");
  }

  const dishId = recordIdSchema.safeParse((await context.params).id);

  if (!dishId.success) {
    return fail("VALIDATION_ERROR");
  }

  try {
    return ok({ image: await retryDishImage(clerkUserId, dishId.data) });
  } catch (error) {
    return failFromError(error);
  }
}
