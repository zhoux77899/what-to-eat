import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthModal } from "@/components/auth/auth-modal";
import { AuthModalProvider } from "@/components/auth/auth-modal-provider";
import { AuthRuntimeProvider } from "@/components/auth/auth-runtime-provider";
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
    configurationError: "Clerk 登录尚未配置。请配置 Clerk 环境变量后重启开发服务器。",
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

  it("starts Google OAuth with same-page redirect and keeps the locale callback", async () => {
    const openSpy = vi.spyOn(window, "open");
    renderWithIntl(<AuthModal locale="zh" onClose={vi.fn()} open returnTo="/zh/app" />);

    fireEvent.click(screen.getByRole("button", { name: "使用 Google 登录" }));

    await waitFor(() => {
      expect(startSso).toHaveBeenCalledWith({
        strategy: "oauth_google",
        redirectUrl: "/zh/app",
        redirectCallbackUrl: "/zh/sso-callback"
      });
    });
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("starts GitHub OAuth with same-page redirect and keeps the locale callback", async () => {
    const openSpy = vi.spyOn(window, "open");
    renderWithIntl(<AuthModal locale="zh" onClose={vi.fn()} open returnTo="/zh/settings/openai-key" />);

    fireEvent.click(screen.getByRole("button", { name: "使用 GitHub 登录" }));

    await waitFor(() => {
      expect(startSso).toHaveBeenCalledWith({
        strategy: "oauth_github",
        redirectUrl: "/zh/settings/openai-key",
        redirectCallbackUrl: "/zh/sso-callback"
      });
    });
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("shows a localized error and re-enables provider buttons when SSO fails", async () => {
    startSso.mockResolvedValue({ error: new Error("Provider failed") });
    renderWithIntl(<AuthModal locale="zh" onClose={vi.fn()} open returnTo="/zh/app" />);

    fireEvent.click(screen.getByRole("button", { name: "使用 Google 登录" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("登录失败，请重试。");
    expect(screen.getByRole("button", { name: "使用 Google 登录" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "使用 GitHub 登录" })).toBeEnabled();
  });

  it("keeps an escape path available while an OAuth request is pending", async () => {
    let finishSso: ((result: { error: null }) => void) | undefined;
    startSso.mockReturnValue(
      new Promise((resolve) => {
        finishSso = resolve;
      })
    );
    const onClose = vi.fn();

    renderWithIntl(<AuthModal locale="zh" onClose={onClose} open returnTo="/zh/app" />);
    fireEvent.click(screen.getByRole("button", { name: "使用 Google 登录" }));

    const closeButton = screen.getByRole("button", { name: "关闭" });
    expect(closeButton).toBeEnabled();
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledOnce();

    finishSso?.({ error: null });
  });

  it("uses Radix Dialog primitives for modal focus management", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src", "components", "auth", "auth-modal.tsx"),
      "utf8"
    );

    expect(source).toContain('@radix-ui/react-dialog');
    expect(source).toContain("Dialog.Root");
    expect(source).toContain("Dialog.Content");
  });

  it("renders the hand-drawn provider stickers", () => {
    renderWithIntl(<AuthModal locale="zh" onClose={vi.fn()} open returnTo="/zh/app" />);

    expect(document.querySelector(".auth-provider-icon-google")).toBeInTheDocument();
    expect(document.querySelector(".auth-provider-icon-github")).toBeInTheDocument();
  });
});

describe("ProtectedLink", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    startSso.mockReset();
    window.history.replaceState(null, "", "/zh");
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

  it("falls back to the locale app path when a sign-in query contains an external return target", async () => {
    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: false });
    startSso.mockResolvedValue({ error: null });
    vi.spyOn(window, "open").mockReturnValue(null);
    window.history.replaceState(null, "", "/zh?signIn=1&returnTo=https%3A%2F%2Fevil.test%2Ftrap");

    renderWithIntl(
      <AuthModalProvider locale="zh">
        <div />
      </AuthModalProvider>
    );

    fireEvent.click(await screen.findByRole("button", { name: "使用 Google 登录" }));

    await waitFor(() => {
      expect(startSso).toHaveBeenCalledWith({
        strategy: "oauth_google",
        redirectUrl: "/zh/app",
        redirectCallbackUrl: "/zh/sso-callback"
      });
    });
  });

  it("shows a configuration error without calling Clerk hooks when Clerk is disabled", () => {
    useAuthMock.mockImplementation(() => {
      throw new Error("useAuth should not be called when Clerk is disabled");
    });

    renderWithIntl(
      <AuthRuntimeProvider clerkEnabled={false}>
        <AuthModalProvider locale="zh">
          <ProtectedLink href="/zh/app">Start</ProtectedLink>
        </AuthModalProvider>
      </AuthRuntimeProvider>
    );

    fireEvent.click(screen.getByRole("link", { name: "Start" }));

    expect(screen.getByRole("dialog", { name: "登录" })).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Clerk 登录尚未配置。请配置 Clerk 环境变量后重启开发服务器。"
    );
    expect(screen.queryByRole("button", { name: "使用 Google 登录" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "使用 GitHub 登录" })).not.toBeInTheDocument();
  });
});
