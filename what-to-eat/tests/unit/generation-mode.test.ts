import { describe, expect, it } from "vitest";

import { getGenerationMode } from "@/server/generation-mode";

describe("generation mode", () => {
  it("enables Local Codex Mode only for explicitly enabled local development", () => {
    expect(
      getGenerationMode({
        NODE_ENV: "development",
        LOCAL_CODEX_ENABLED: "true"
      })
    ).toBe("local_codex");
  });

  it("fails closed on Vercel and non-development processes", () => {
    expect(
      getGenerationMode({
        NODE_ENV: "development",
        LOCAL_CODEX_ENABLED: "true",
        VERCEL_ENV: "preview"
      })
    ).toBe("production_openai");
    expect(
      getGenerationMode({
        NODE_ENV: "production",
        LOCAL_CODEX_ENABLED: "true"
      })
    ).toBe("production_openai");
  });
});
