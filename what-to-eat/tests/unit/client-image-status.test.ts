import { describe, expect, it } from "vitest";

import {
  getImageStatusPollDelay,
  resolveClientImageStatus
} from "@/lib/client-image-status";

describe("client image status helpers", () => {
  it("keeps pending images active before the service deadline", () => {
    expect(resolveClientImageStatus("pending", "2026-06-06T02:00:05.000Z", Date.parse("2026-06-06T02:00:00.000Z"))).toBe("pending");
  });

  it("falls back to failed once the service deadline is reached", () => {
    expect(resolveClientImageStatus("pending", "2026-06-06T02:00:00.000Z", Date.parse("2026-06-06T02:00:00.000Z"))).toBe("failed");
  });

  it("polls pending images until the nearest interval or deadline", () => {
    expect(
      getImageStatusPollDelay(
        [{ status: "pending", deadlineAt: "2026-06-06T02:00:01.000Z" }],
        Date.parse("2026-06-06T02:00:00.000Z"),
        2_500
      )
    ).toBe(1_000);
  });

  it("stops polling when no active pending image remains", () => {
    expect(
      getImageStatusPollDelay(
        [{ status: "failed", deadlineAt: null }],
        Date.parse("2026-06-06T02:00:00.000Z"),
        2_500
      )
    ).toBeNull();
  });
});
