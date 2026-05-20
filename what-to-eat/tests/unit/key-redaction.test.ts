import { describe, expect, it } from "vitest";

import { createKeyHint, redactOpenAiApiKey } from "@/lib/key-redaction";

describe("OpenAI key redaction", () => {
  it("only exposes a short suffix hint for display", () => {
    expect(createKeyHint("sk-proj-abcdefghijklmnopqrstuvwxyz1234567890")).toBe("...7890");
  });

  it("does not leak short or malformed input values", () => {
    expect(redactOpenAiApiKey("short")).toBe("...");
    expect(redactOpenAiApiKey("")).toBe("...");
  });
});
