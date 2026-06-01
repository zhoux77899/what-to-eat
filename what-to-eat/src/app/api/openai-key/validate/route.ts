import { fail, failFromError, ok } from "@/server/api-response";
import { getCurrentClerkUserId } from "@/server/auth";
import { BusinessError } from "@/server/business-error";
import { decryptSecret } from "@/server/crypto";
import { ensureUser, getOpenAiKey, setOpenAiKeyStatus } from "@/server/data";
import { validateOpenAiKey } from "@/server/generation-adapter";

export async function POST() {
  const clerkUserId = await getCurrentClerkUserId();

  if (!clerkUserId) {
    return fail("UNAUTHENTICATED");
  }

  try {
    const user = await ensureUser(clerkUserId);
    const key = await getOpenAiKey(user.id);

    if (!key) {
      throw new BusinessError("MISSING_OPENAI_KEY");
    }

    const valid = await validateOpenAiKey(decryptSecret(key.encryptedApiKey));
    const updated = await setOpenAiKeyStatus(user.id, valid ? "valid" : "invalid");

    return ok({ status: updated?.status ?? "invalid" });
  } catch (error) {
    return failFromError(error);
  }
}
