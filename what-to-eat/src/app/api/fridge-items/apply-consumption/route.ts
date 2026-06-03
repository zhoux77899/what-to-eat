import type { NextRequest } from "next/server";

import { fail, failFromError, ok } from "@/server/api-response";
import { getCurrentClerkUserId } from "@/server/auth";
import { confirmFridgeConsumption } from "@/server/fridge-service";
import { parseJsonBody } from "@/server/request";
import { fridgeConsumptionRequestSchema } from "@/server/validation";

export async function POST(request: NextRequest) {
  const clerkUserId = await getCurrentClerkUserId();

  if (!clerkUserId) {
    return fail("UNAUTHENTICATED");
  }

  const parsed = await parseJsonBody(request, fridgeConsumptionRequestSchema);

  if (!parsed.success) {
    return fail("VALIDATION_ERROR");
  }

  try {
    return ok(await confirmFridgeConsumption(clerkUserId, parsed.data));
  } catch (error) {
    return failFromError(error);
  }
}
