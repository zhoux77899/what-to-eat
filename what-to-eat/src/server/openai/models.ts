export const OPENAI_PROVIDER_ID = "openai";
export const TEXT_RECOMMENDATION_MODEL = "gpt-5.5";
export const MEAL_IMAGE_MODEL = "gpt-image-2";

export const OPENAI_MODEL_ALLOWLIST = [
  TEXT_RECOMMENDATION_MODEL,
  MEAL_IMAGE_MODEL
] as const;

export type OpenAiModelId = (typeof OPENAI_MODEL_ALLOWLIST)[number];

export function isAllowedOpenAiModel(modelId: string): modelId is OpenAiModelId {
  return OPENAI_MODEL_ALLOWLIST.includes(modelId as OpenAiModelId);
}
