import type { NextRequest } from "next/server";

import { fail, failFromError, ok } from "@/server/api-response";
import { getCurrentClerkUserId } from "@/server/auth";
import { editFridgeItem, removeFridgeItem } from "@/server/fridge-service";
import { parseJsonBody } from "@/server/request";
import { fridgeItemUpdateSchema, recordIdSchema } from "@/server/validation";

type RouteContext = { params: Promise<{ itemId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const clerkUserId = await getCurrentClerkUserId();

  if (!clerkUserId) {
    return fail("UNAUTHENTICATED");
  }

  const itemId = recordIdSchema.safeParse((await context.params).itemId);
  const body = await parseJsonBody(request, fridgeItemUpdateSchema);

  if (!itemId.success || !body.success) {
    return fail("VALIDATION_ERROR");
  }

  try {
    return ok({ item: await editFridgeItem(clerkUserId, itemId.data, body.data) });
  } catch (error) {
    return failFromError(error);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const clerkUserId = await getCurrentClerkUserId();

  if (!clerkUserId) {
    return fail("UNAUTHENTICATED");
  }

  const itemId = recordIdSchema.safeParse((await context.params).itemId);

  if (!itemId.success) {
    return fail("VALIDATION_ERROR");
  }

  try {
    await removeFridgeItem(clerkUserId, itemId.data);
    return ok({ deleted: true });
  } catch (error) {
    return failFromError(error);
  }
}
