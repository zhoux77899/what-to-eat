import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthModal } from "@/components/auth/auth-modal";
import { AuthModalProvider } from "@/components/auth/auth-modal-provider";
import { ProtectedLink } from "@/components/auth/protected-link";

const startSso = vi.fn();
const useAuthMock = vi.fn();

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => useAuthMock(),
  useSignIn: () => ({
    errors: [],
    fetchStatus: "idle",
    signIn: {
      sso: startSso
    }
  }),
  UserButton: () => <button type="button">User menu</button>
}));

const messages = {
  auth: {
    title: "登录",
    description: "使用你的账号继续。",
    signInWithGoogle: "使用 Google 登录",
    signInWithGitHub: "使用 GitHub 登录",
    loading: "正在打开登录窗口...",
    error: "登录失败，请重试。",
    close: "关闭"
  }
};

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="zh" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
}

describe("AuthModal", () => {
  beforeEach(() => {
    startSso.mockReset();
    startSso.mockResolvedValue({ error: null });
    vi.spyOn(window, "open").mockReturnValue(null);
  });

  it("starts Google OAuth in a popup and keeps the locale callback", async () => {
    renderWithIntl(<AuthModal locale="zh" onClose={vi.fn()} open returnTo="/zh/app" />);

    fireEvent.click(screen.getByRole("button", { name: "使用 Google 登录" }));

    await waitFor(() => {
      expect(startSso).toHaveBeenCalledWith({
        strategy: "oauth_google",
        redirectUrl: "/zh/app",
        redirectCallbackUrl: "/zh/sso-callback",
        popup: undefined
      });
    });
  });

  it("starts GitHub OAuth in a popup and keeps the locale callback", async () => {
    renderWithIntl(<AuthModal locale="zh" onClose={vi.fn()} open returnTo="/zh/settings/openai-key" />);

    fireEvent.click(screen.getByRole("button", { name: "使用 GitHub 登录" }));

    await waitFor(() => {
      expect(startSso).toHaveBeenCalledWith({
        strategy: "oauth_github",
        redirectUrl: "/zh/settings/openai-key",
        redirectCallbackUrl: "/zh/sso-callback",
        popup: undefined
      });
    });
  });
});

describe("ProtectedLink", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    startSso.mockReset();
  });

  it("opens the auth modal instead of navigating when the user is signed out", () => {
    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: false });

    renderWithIntl(
      <AuthModalProvider locale="zh">
        <ProtectedLink href="/zh/app">Start</ProtectedLink>
      </AuthModalProvider>
    );

    fireEvent.click(screen.getByRole("link", { name: "Start" }));

    expect(screen.getByRole("dialog", { name: "登录" })).toBeVisible();
  });

  it("does not open the auth modal when the user is signed in", () => {
    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    const preventNavigation = vi.fn((event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
    });

    renderWithIntl(
      <AuthModalProvider locale="zh">
        <ProtectedLink href="/zh/app" onClick={preventNavigation}>
          Start
        </ProtectedLink>
      </AuthModalProvider>
    );

    fireEvent.click(screen.getByRole("link", { name: "Start" }));

    expect(preventNavigation).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog", { name: "登录" })).not.toBeInTheDocument();
  });
});
