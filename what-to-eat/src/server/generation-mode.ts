import type { GenerationMode } from "@/db/schema";

type GenerationEnvironment = Partial<
  Pick<NodeJS.ProcessEnv, "NODE_ENV" | "VERCEL_ENV" | "LOCAL_CODEX_ENABLED">
>;

export function getGenerationMode(environment: GenerationEnvironment = process.env): GenerationMode {
  if (
    environment.NODE_ENV === "development" &&
    environment.LOCAL_CODEX_ENABLED === "true" &&
    !environment.VERCEL_ENV
  ) {
    return "local_codex";
  }

  return "production_openai";
}
