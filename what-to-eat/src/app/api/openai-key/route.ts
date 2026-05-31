import type { NextRequest } from "next/server";

import { createKeyHint } from "@/lib/key-redaction";
import { fail, ok } from "@/server/api-response";
import { getCurrentClerkUserId } from "@/server/auth";
import { encryptSecret } from "@/server/crypto";
import { parseJsonBody } from "@/server/request";
import { openAiKeySchema } from "@/server/validation";

export async function GET() {
  const userId = await getCurrentClerkUserId();

  if (!userId) {
    return fail("UNAUTHENTICATED");
  }

  return ok({
    key: null,
    status: "not_configured"
  });
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentClerkUserId();

  if (!userId) {
    return fail("UNAUTHENTICATED");
  }

  const parsed = await parseJsonBody(request, openAiKeySchema);

  if (!parsed.success) {
    return fail("VALIDATION_ERROR");
  }

  try {
    const encryptedApiKey = encryptSecret(parsed.data.apiKey);

    return ok({
      key: {
        hint: createKeyHint(parsed.data.apiKey),
        status: "validation_required"
      },
      storagePreview: {
        encryptedLength: encryptedApiKey.length
      }
    });
  } catch {
    return fail("CONFIGURATION_ERROR");
  }
}

export async function DELETE() {
  const userId = await getCurrentClerkUserId();

  if (!userId) {
    return fail("UNAUTHENTICATED");
  }

  return ok({
    deleted: true
  });
}
