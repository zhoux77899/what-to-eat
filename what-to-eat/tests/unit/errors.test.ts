import { describe, expect, it } from "vitest";

import {
  BUSINESS_ERROR_CODES,
  ERROR_MESSAGE_KEYS,
  getHttpStatusForError
} from "@/lib/errors";

describe("business errors", () => {
  it("maps every stable error code to an i18n message key", () => {
    for (const code of BUSINESS_ERROR_CODES) {
      expect(ERROR_MESSAGE_KEYS[code]).toMatch(/^errors\./);
    }
  });

  it("uses safe HTTP statuses for authentication, key, rate limit, and upstream failures", () => {
    expect(getHttpStatusForError("UNAUTHENTICATED")).toBe(401);
    expect(getHttpStatusForError("MISSING_OPENAI_KEY")).toBe(409);
    expect(getHttpStatusForError("RATE_LIMITED")).toBe(429);
    expect(getHttpStatusForError("UPSTREAM_OPENAI_ERROR")).toBe(502);
  });
});
