import type { GenerationMode } from "@/db/schema";
import { BusinessError } from "@/server/business-error";
import { decryptSecret } from "@/server/crypto";
import { getOpenAiKey, touchOpenAiKeyLastUsed } from "@/server/data";

export async function getGenerationApiKey(userId: string, mode: GenerationMode) {
  if (mode === "local_codex") {
    return undefined;
  }

  const record = await getOpenAiKey(userId);

  if (!record) {
    throw new BusinessError("MISSING_OPENAI_KEY");
  }

  if (record.status !== "valid") {
    throw new BusinessError("INVALID_OPENAI_KEY");
  }

  await touchOpenAiKeyLastUsed(userId);
  return decryptSecret(record.encryptedApiKey);
}
