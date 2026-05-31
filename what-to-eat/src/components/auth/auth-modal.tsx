"use client";

import { useSignIn } from "@clerk/nextjs";
import * as Dialog from "@radix-ui/react-dialog";
import { useTranslations } from "next-intl";
import { useState } from "react";

type AuthModalProps = {
  locale: string;
  open: boolean;
  returnTo?: string;
  onClose: () => void;
};

type OAuthStrategy = "oauth_google" | "oauth_github";

function GoogleStickerIcon() {
  return (
    <svg
      aria-hidden="true"
      className="auth-provider-icon auth-provider-icon-google"
      fill="none"
      height="56"
      viewBox="0 0 56 56"
      width="56"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        className="auth-provider-icon-paper"
        d="M9.5 13.3c4.6-4.4 12.1-5.1 18-4.8 8.8.5 16.3 3.5 18.9 10.7 2.6 7.1.7 16.2-4.8 21.3-5.8 5.3-15.3 6.3-23 3.9-7.1-2.2-12.2-7.3-12.9-15.3-.5-5.4.3-12.5 3.8-15.8Z"
      />
      <g className="auth-provider-icon-google-mark" transform="translate(8 8) scale(0.84)">
        <path
          className="auth-provider-icon-google-blue"
          d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-3.2 0-6.1-1.3-8.2-3.4l-6 4.7C13.4 41.5 18.6 44 24 44c11 0 20-8.9 20-20 0-1.3-.1-2.6-.4-3.9Z"
        />
        <path
          className="auth-provider-icon-google-green"
          d="M24 44c5.4 0 10.3-2 13.9-5.4l-6.4-5.4C29.5 34.9 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.4 39.5 16.1 44 24 44Z"
        />
        <path
          className="auth-provider-icon-google-yellow"
          d="M6.2 33.1l6.5-5c-.4-1.3-.7-2.6-.7-4.1 0-1.4.3-2.8.7-4.1l-6.5-5C4.8 17.6 4 20.7 4 24s.8 6.4 2.2 9.1Z"
        />
        <path
          className="auth-provider-icon-google-red"
          d="M24 12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.1 6 29.3 4 24 4 16.1 4 9.4 8.5 6.2 14.9l6.5 5C14.4 15.3 18.8 12 24 12Z"
        />
      </g>
    </svg>
  );
}

function GitHubStickerIcon() {
  return (
    <svg
      aria-hidden="true"
      className="auth-provider-icon auth-provider-icon-github"
      fill="none"
      height="56"
      viewBox="0 0 56 56"
      width="56"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        className="auth-provider-icon-paper"
        d="M12.2 11.8c5.6-3 14.2-4.1 21.5-2.4 7.2 1.6 12.2 6 13.1 12.5 1 7.1-2.5 15.1-8.6 18.7-6.5 3.9-16.4 3.6-23.2-.4C8.9 36.7 5.9 30.3 7 23.1c.7-4.7 3.2-9.4 5.2-11.3Z"
      />
      <path
        className="auth-provider-icon-github-mark"
        d="M970 2301 c-305 -68 -555 -237 -727 -493 -301 -451 -241 -1056 143 -1442 115 -116 290 -228 422 -271 49 -16 55 -16 77 -1 24 16 25 20 25 135 l0 118 -88 -5 c-103 -5 -183 13 -231 54 -17 14 -50 62 -73 106 -38 74 -66 108 -144 177 -26 23 -27 24 -9 37 43 32 130 1 185 -65 96 -117 133 -148 188 -160 49 -10 94 -6 162 14 9 3 21 24 27 48 6 23 22 58 35 77 l24 35 -81 16 c-170 35 -275 96 -344 200 -64 96 -85 179 -86 334 0 146 16 206 79 288 28 36 31 47 23 68 -15 36 -11 188 5 234 13 34 20 40 47 43 45 5 129 -24 214 -72 l73 -42 64 15 c91 21 364 20 446 0 l62 -16 58 35 c77 46 175 82 224 82 39 0 39 -1 55 -52 17 -59 20 -166 5 -217 -8 -30 -6 -39 16 -68 109 -144 121 -383 29 -579 -62 -129 -193 -219 -369 -252 l-84 -16 31 -55 32 -56 3 -223 4 -223 25 -16 c23 -15 28 -15 76 2 80 27 217 101 292 158 446 334 590 933 343 1431 -145 293 -419 518 -733 602 -137 36 -395 44 -525 15z"
        transform="translate(9.5 8) scale(0.0152) translate(0 2400) scale(1 -1)"
      />
    </svg>
  );
}

function CloseStickerIcon() {
  return (
    <svg
      aria-hidden="true"
      className="auth-modal-close-icon"
      fill="none"
      height="24"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M7.2 7.4c3.2 3 5.6 5.3 9.6 9.2" />
      <path d="M16.8 7.1c-3.7 3.2-6.1 6.1-9.4 9.7" />
    </svg>
  );
}

export function AuthModal({ locale, open, returnTo, onClose }: AuthModalProps) {
  const t = useTranslations("auth");
  const signInSignal = useSignIn();
  const [pendingStrategy, setPendingStrategy] = useState<OAuthStrategy | null>(null);
  const [hasError, setHasError] = useState(false);

  const completeUrl = returnTo ?? `/${locale}/app`;
  const isSignInLoaded = signInSignal.fetchStatus !== "fetching" && Boolean(signInSignal.signIn);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      onClose();
    }
  };

  const startOAuth = async (strategy: OAuthStrategy) => {
    if (!isSignInLoaded || !signInSignal.signIn) {
      return;
    }

    setPendingStrategy(strategy);
    setHasError(false);

    try {
      const result = await signInSignal.signIn.sso({
        strategy,
        redirectUrl: completeUrl,
        redirectCallbackUrl: `/${locale}/sso-callback`
      });

      if (result.error) {
        throw result.error;
      }
    } catch {
      setHasError(true);
      setPendingStrategy(null);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="auth-modal-backdrop">
          <Dialog.Content className="auth-modal-card">
            <div className="auth-modal-pin" aria-hidden="true" />
            <div className="auth-modal-header">
              <div className="auth-modal-copy">
                <Dialog.Title className="auth-modal-title">{t("title")}</Dialog.Title>
                <Dialog.Description className="auth-modal-description">
                  {t("description")}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button aria-label={t("close")} className="auth-modal-close" type="button">
                  <CloseStickerIcon />
                </button>
              </Dialog.Close>
            </div>

            <div className="auth-provider-list">
              <button
                className="auth-provider-button auth-provider-button-google"
                disabled={!isSignInLoaded || pendingStrategy !== null}
                onClick={() => void startOAuth("oauth_google")}
                type="button"
              >
                <GoogleStickerIcon />
                <span className="auth-provider-button-label">
                  {pendingStrategy === "oauth_google" ? t("loading") : t("signInWithGoogle")}
                </span>
              </button>
              <button
                className="auth-provider-button auth-provider-button-github"
                disabled={!isSignInLoaded || pendingStrategy !== null}
                onClick={() => void startOAuth("oauth_github")}
                type="button"
              >
                <GitHubStickerIcon />
                <span className="auth-provider-button-label">
                  {pendingStrategy === "oauth_github" ? t("loading") : t("signInWithGitHub")}
                </span>
              </button>
            </div>

            {hasError ? (
              <p className="auth-modal-error" role="alert">
                {t("error")}
              </p>
            ) : null}
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
