import { describe, expect, it } from "vitest";

import {
  MEAL_IMAGE_MODEL,
  OPENAI_MODEL_ALLOWLIST,
  OPENAI_PROVIDER_ID,
  TEXT_RECOMMENDATION_MODEL,
  isAllowedOpenAiModel
} from "@/server/openai/models";

describe("OpenAI model allowlist", () => {
  it("only exposes the fixed OpenAI provider and the two approved model ids", () => {
    expect(OPENAI_PROVIDER_ID).toBe("openai");
    expect(TEXT_RECOMMENDATION_MODEL).toBe("gpt-5.5");
    expect(MEAL_IMAGE_MODEL).toBe("gpt-image-2");
    expect(OPENAI_MODEL_ALLOWLIST).toEqual(["gpt-5.5", "gpt-image-2"]);
  });

  it("rejects older OpenAI models and non-OpenAI provider model ids", () => {
    expect(isAllowedOpenAiModel("gpt-5.5")).toBe(true);
    expect(isAllowedOpenAiModel("gpt-image-2")).toBe(true);
    expect(isAllowedOpenAiModel("gpt-4.1-mini")).toBe(false);
    expect(isAllowedOpenAiModel("deepseek-v4-flash")).toBe(false);
    expect(isAllowedOpenAiModel("claude-sonnet-4-20250514")).toBe(false);
  });
});
