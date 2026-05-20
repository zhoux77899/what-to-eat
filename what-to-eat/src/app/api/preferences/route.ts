import type { NextRequest } from "next/server";

import { DEFAULT_PREFERENCES } from "@/lib/preferences";
import { fail, ok } from "@/server/api-response";
import { getCurrentClerkUserId } from "@/server/auth";
import { parseJsonBody } from "@/server/request";
import { preferencesSchema } from "@/server/validation";

export async function GET() {
  const userId = await getCurrentClerkUserId();

  if (!userId) {
    return fail("UNAUTHENTICATED");
  }

  return ok({
    preferences: DEFAULT_PREFERENCES
  });
}

export async function PUT(request: NextRequest) {
  const userId = await getCurrentClerkUserId();

  if (!userId) {
    return fail("UNAUTHENTICATED");
  }

  const parsed = await parseJsonBody(request, preferencesSchema);

  if (!parsed.success) {
    return fail("VALIDATION_ERROR");
  }

  return ok({
    preferences: parsed.data
  });
}
