import type { NextRequest } from "next/server";

import { fail, failFromError, ok } from "@/server/api-response";
import { getCurrentClerkUserId } from "@/server/auth";
import { ensureUser, getPreferences, savePreferences } from "@/server/data";
import { parseJsonBody } from "@/server/request";
import { preferencesSchema } from "@/server/validation";

export async function GET() {
  const clerkUserId = await getCurrentClerkUserId();

  if (!clerkUserId) {
    return fail("UNAUTHENTICATED");
  }

  try {
    const user = await ensureUser(clerkUserId);
    return ok({ preferences: await getPreferences(user.id) });
  } catch (error) {
    return failFromError(error);
  }
}

export async function PUT(request: NextRequest) {
  const clerkUserId = await getCurrentClerkUserId();

  if (!clerkUserId) {
    return fail("UNAUTHENTICATED");
  }

  const parsed = await parseJsonBody(request, preferencesSchema);

  if (!parsed.success) {
    return fail("VALIDATION_ERROR");
  }

  try {
    const user = await ensureUser(clerkUserId);
    return ok({ preferences: await savePreferences(user.id, parsed.data) });
  } catch (error) {
    return failFromError(error);
  }
}
