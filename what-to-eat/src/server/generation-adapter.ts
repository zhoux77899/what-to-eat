import { Codex } from "@openai/codex-sdk";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import type { GenerationMode } from "@/db/schema";
import {
  recommendationResultJsonSchema,
  recommendationResultSchema,
  type RecommendationResult
} from "@/lib/recommendations";
import { BusinessError } from "@/server/business-error";
import { MEAL_IMAGE_MODEL, TEXT_RECOMMENDATION_MODEL } from "@/server/openai/models";

export async function validateOpenAiKey(apiKey: string) {
  try {
    await new OpenAI({ apiKey }).models.list();
    return true;
  } catch {
    return false;
  }
}

export async function generateRecommendationText(input: {
  mode: GenerationMode;
  apiKey?: string;
  prompt: string;
}): Promise<RecommendationResult> {
  if (input.mode === "local_codex") {
    return generateRecommendationWithLocalCodex(input.prompt);
  }

  if (!input.apiKey) {
    throw new BusinessError("MISSING_OPENAI_KEY");
  }

  try {
    const response = await new OpenAI({ apiKey: input.apiKey }).responses.parse({
      model: TEXT_RECOMMENDATION_MODEL,
      input: input.prompt,
      text: {
        format: zodTextFormat(recommendationResultSchema, "meal_recommendation")
      }
    });

    if (!response.output_parsed) {
      throw new BusinessError("MODEL_RESPONSE_INVALID");
    }

    return response.output_parsed;
  } catch (error) {
    if (error instanceof BusinessError) {
      throw error;
    }

    throw new BusinessError("UPSTREAM_OPENAI_ERROR");
  }
}

async function generateRecommendationWithLocalCodex(prompt: string) {
  try {
    const codex = new Codex();
    const thread = codex.startThread({
      approvalPolicy: "never",
      sandboxMode: "read-only",
      skipGitRepoCheck: true,
      webSearchMode: "disabled",
      workingDirectory: process.cwd()
    });
    const turn = await thread.run(prompt, {
      outputSchema: recommendationResultJsonSchema
    });
    const parsed = recommendationResultSchema.safeParse(JSON.parse(turn.finalResponse));

    if (!parsed.success) {
      throw new BusinessError("MODEL_RESPONSE_INVALID");
    }

    return parsed.data;
  } catch (error) {
    if (error instanceof BusinessError) {
      throw error;
    }

    throw new BusinessError("LOCAL_CODEX_UNAVAILABLE");
  }
}

export async function generateImageBytes(input: {
  mode: GenerationMode;
  apiKey?: string;
  prompt: string;
}) {
  if (input.mode === "local_codex") {
    throw new BusinessError("LOCAL_CODEX_UNAVAILABLE");
  }

  if (!input.apiKey) {
    throw new BusinessError("MISSING_OPENAI_KEY");
  }

  try {
    const response = await new OpenAI({ apiKey: input.apiKey }).images.generate({
      model: MEAL_IMAGE_MODEL,
      prompt: input.prompt,
      size: "1024x1024"
    });
    const base64Image = response.data?.[0]?.b64_json;

    if (!base64Image) {
      throw new BusinessError("UPSTREAM_OPENAI_ERROR");
    }

    return Buffer.from(base64Image, "base64");
  } catch (error) {
    if (error instanceof BusinessError) {
      throw error;
    }

    throw new BusinessError("UPSTREAM_OPENAI_ERROR");
  }
}
