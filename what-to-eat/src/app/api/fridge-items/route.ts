import type { NextRequest } from "next/server";

import { fail, failFromError, ok } from "@/server/api-response";
import { getCurrentClerkUserId } from "@/server/auth";
import { createFridgeItem, getFridge } from "@/server/fridge-service";
import { parseJsonBody } from "@/server/request";
import { fridgeItemSchema } from "@/server/validation";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET() {
  const clerkUserId = await getCurrentClerkUserId();

  if (!clerkUserId) {
    return fail("UNAUTHENTICATED");
  }

  try {
    return ok({ items: await getFridge(clerkUserId) });
  } catch (error) {
    return failFromError(error);
  }
}

export async function POST(request: NextRequest) {
  const clerkUserId = await getCurrentClerkUserId();

  if (!clerkUserId) {
    return fail("UNAUTHENTICATED");
  }

  const parsed = await parseJsonBody(request, fridgeItemSchema);

  if (!parsed.success) {
    return fail("VALIDATION_ERROR");
  }

  try {
    return ok({ item: await createFridgeItem(clerkUserId, parsed.data) }, { status: 201 });
  } catch (error) {
    return failFromError(error);
  }
}
