import { fail, failFromError, ok } from "@/server/api-response";
import { getCurrentClerkUserId } from "@/server/auth";
import { retryFridgeItemImage } from "@/server/fridge-service";
import { recordIdSchema } from "@/server/validation";

type RouteContext = { params: Promise<{ itemId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const clerkUserId = await getCurrentClerkUserId();

  if (!clerkUserId) {
    return fail("UNAUTHENTICATED");
  }

  const itemId = recordIdSchema.safeParse((await context.params).itemId);

  if (!itemId.success) {
    return fail("VALIDATION_ERROR");
  }

  try {
    return ok({ image: await retryFridgeItemImage(clerkUserId, itemId.data) });
  } catch (error) {
    return failFromError(error);
  }
}
