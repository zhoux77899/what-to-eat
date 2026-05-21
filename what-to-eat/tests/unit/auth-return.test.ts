import { describe, expect, it } from "vitest";

import { normalizeAuthReturnTo } from "@/lib/auth-return";

describe("normalizeAuthReturnTo", () => {
  it("keeps protected same-locale return paths", () => {
    expect(normalizeAuthReturnTo("zh", "/zh/settings/openai-key?from=home#key")).toBe(
      "/zh/settings/openai-key?from=home#key"
    );
  });

  it("falls back when the return path is external or protocol-relative", () => {
    expect(normalizeAuthReturnTo("zh", "https://evil.test/trap")).toBe("/zh/app");
    expect(normalizeAuthReturnTo("zh", "//evil.test/trap")).toBe("/zh/app");
  });

  it("falls back when the return path is cross-locale or public", () => {
    expect(normalizeAuthReturnTo("zh", "/en/app")).toBe("/zh/app");
    expect(normalizeAuthReturnTo("zh", "/zh")).toBe("/zh/app");
  });

  it("falls back when the return path is malformed", () => {
    expect(normalizeAuthReturnTo("zh", "\\zh\\app")).toBe("/zh/app");
    expect(normalizeAuthReturnTo("unknown", "/unknown/app")).toBe("/zh/app");
  });
});
