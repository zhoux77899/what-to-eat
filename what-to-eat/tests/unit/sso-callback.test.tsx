import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SsoCallbackPage from "@/app/[locale]/sso-callback/page";
import { hasUsableClerkConfig } from "@/lib/clerk-config";

vi.mock("@/lib/clerk-config", () => ({
  hasUsableClerkConfig: vi.fn()
}));

vi.mock("@clerk/nextjs", () => ({
  AuthenticateWithRedirectCallback: (props: {
    signInFallbackRedirectUrl: string;
    signUpFallbackRedirectUrl: string;
  }) => (
    <div
      data-testid="clerk-callback"
      data-sign-in-fallback={props.signInFallbackRedirectUrl}
      data-sign-up-fallback={props.signUpFallbackRedirectUrl}
    />
  )
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => {
    if (key === "callbackLoading") {
      return "正在完成登录...";
    }

    if (key === "configurationError") {
      return "Clerk 登录尚未配置。";
    }

    return key;
  }),
  setRequestLocale: vi.fn()
}));

describe("SsoCallbackPage", () => {
  it("renders Clerk callback with a CAPTCHA container for OAuth sign-up protection", async () => {
    vi.mocked(hasUsableClerkConfig).mockReturnValue(true);

    const page = await SsoCallbackPage({ params: Promise.resolve({ locale: "zh" }) });

    render(page);

    expect(screen.getByText("正在完成登录...")).toBeVisible();
    expect(document.querySelector("#clerk-captcha")).toBeInTheDocument();
    expect(screen.getByTestId("clerk-callback")).toHaveAttribute(
      "data-sign-in-fallback",
      "/zh/app"
    );
    expect(screen.getByTestId("clerk-callback")).toHaveAttribute(
      "data-sign-up-fallback",
      "/zh/app"
    );
  });
});
