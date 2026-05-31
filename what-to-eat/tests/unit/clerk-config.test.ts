import { describe, expect, it } from "vitest";

import {
  hasUsableClerkConfig,
  isUsableClerkPublishableKey,
  isUsableClerkSecretKey
} from "@/lib/clerk-config";

function createPublishableKey(frontendApi: string, prefix: "pk_test_" | "pk_live_" = "pk_test_") {
  const encodedFrontendApi = Buffer.from(`${frontendApi}$`, "utf8")
    .toString("base64")
    .replace(/=+$/, "");

  return `${prefix}${encodedFrontendApi}`;
}

describe("Clerk config validation", () => {
  it("accepts parseable Clerk publishable keys and secret keys", () => {
    expect(isUsableClerkPublishableKey(createPublishableKey("valid-clerk.accounts.dev"))).toBe(
      true
    );
    expect(isUsableClerkSecretKey("sk_test_realisticSecretKey")).toBe(true);
  });

  it("rejects dummy, missing, and unparseable Clerk keys", () => {
    expect(isUsableClerkPublishableKey("pk_test_dummy")).toBe(false);
    expect(isUsableClerkPublishableKey("pk_test_notBase64")).toBe(false);
    expect(isUsableClerkPublishableKey("")).toBe(false);
    expect(isUsableClerkSecretKey("sk_test_dummy")).toBe(false);
    expect(isUsableClerkSecretKey("not-a-secret-key")).toBe(false);
  });

  it("requires both usable frontend and backend Clerk keys", () => {
    expect(
      hasUsableClerkConfig({
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: createPublishableKey("valid-clerk.accounts.dev"),
        CLERK_SECRET_KEY: "sk_test_realisticSecretKey"
      })
    ).toBe(true);

    expect(
      hasUsableClerkConfig({
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_dummy",
        CLERK_SECRET_KEY: "sk_test_realisticSecretKey"
      })
    ).toBe(false);

    expect(
      hasUsableClerkConfig({
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: createPublishableKey("valid-clerk.accounts.dev"),
        CLERK_SECRET_KEY: "sk_test_dummy"
      })
    ).toBe(false);
  });
});
