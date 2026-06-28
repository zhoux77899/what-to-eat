"use client";

import { useSignIn } from "@clerk/nextjs";
import * as Dialog from "@radix-ui/react-dialog";
import { GitFork, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

type AuthModalProps = {
  locale: string;
  open: boolean;
  returnTo?: string;
  onClose: () => void;
};

type OAuthStrategy = "oauth_google" | "oauth_github";

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
                <button
                  aria-label={t("close")}
                  className="auth-modal-close"
                  type="button"
                >
                  <X aria-hidden="true" className="auth-modal-close-icon" />
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
                <span aria-hidden="true" className="auth-provider-icon auth-provider-google-mark">
                  G
                </span>
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
                <GitFork aria-hidden="true" className="auth-provider-icon" />
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
