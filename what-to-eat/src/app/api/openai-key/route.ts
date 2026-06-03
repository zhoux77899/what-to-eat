import type { NextRequest } from "next/server";

import { createKeyHint } from "@/lib/key-redaction";
import { fail, failFromError, ok } from "@/server/api-response";
import { getCurrentClerkUserId } from "@/server/auth";
import { encryptSecret } from "@/server/crypto";
import { deleteOpenAiKey, ensureUser, getOpenAiKey, saveOpenAiKey } from "@/server/data";
import { parseJsonBody } from "@/server/request";
import { openAiKeySchema } from "@/server/validation";

export async function GET() {
  const clerkUserId = await getCurrentClerkUserId();

  if (!clerkUserId) {
    return fail("UNAUTHENTICATED");
  }

  try {
    const user = await ensureUser(clerkUserId);
    const key = await getOpenAiKey(user.id);

    return ok({
      key: key ? { hint: key.keyHint, status: key.status } : null,
      status: key?.status ?? "not_configured"
    });
  } catch (error) {
    return failFromError(error);
  }
}

export async function POST(request: NextRequest) {
  const clerkUserId = await getCurrentClerkUserId();

  if (!clerkUserId) {
    return fail("UNAUTHENTICATED");
  }

  const parsed = await parseJsonBody(request, openAiKeySchema);

  if (!parsed.success) {
    return fail("VALIDATION_ERROR");
  }

  try {
    const user = await ensureUser(clerkUserId);
    const key = await saveOpenAiKey(user.id, {
      encryptedApiKey: encryptSecret(parsed.data.apiKey),
      keyHint: createKeyHint(parsed.data.apiKey)
    });

    return ok({
      key: {
        hint: key.keyHint,
        status: key.status
      }
    });
  } catch (error) {
    return failFromError(error);
  }
}

export async function DELETE() {
  const clerkUserId = await getCurrentClerkUserId();

  if (!clerkUserId) {
    return fail("UNAUTHENTICATED");
  }

  try {
    const user = await ensureUser(clerkUserId);
    await deleteOpenAiKey(user.id);
    return ok({ deleted: true });
  } catch (error) {
    return failFromError(error);
  }
}
