"use client";

import { useSignIn } from "@clerk/nextjs";
import { Code2, Globe, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

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

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const completeUrl = returnTo ?? `/${locale}/app`;
  const isSignInLoaded = signInSignal.fetchStatus !== "fetching" && Boolean(signInSignal.signIn);

  const startOAuth = async (strategy: OAuthStrategy) => {
    if (!isSignInLoaded || !signInSignal.signIn) {
      return;
    }

    setPendingStrategy(strategy);
    setHasError(false);

    try {
      const popup = window.open("", "what-to-eat-oauth", "width=520,height=720");

      const result = await signInSignal.signIn.sso({
        strategy,
        redirectUrl: completeUrl,
        redirectCallbackUrl: `/${locale}/sso-callback`,
        popup: popup ?? undefined
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
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-background/80 px-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        aria-labelledby="auth-modal-title"
        aria-modal="true"
        className="w-full max-w-sm rounded-lg border bg-card p-5 shadow-lg"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold" id="auth-modal-title">
              {t("title")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
          </div>
          <button
            aria-label={t("close")}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          <Button
            className="w-full justify-start"
            disabled={!isSignInLoaded || pendingStrategy !== null}
            onClick={() => void startOAuth("oauth_google")}
            type="button"
            variant="secondary"
          >
            <Globe className="h-4 w-4" aria-hidden="true" />
            {pendingStrategy === "oauth_google" ? t("loading") : t("signInWithGoogle")}
          </Button>
          <Button
            className="w-full justify-start"
            disabled={!isSignInLoaded || pendingStrategy !== null}
            onClick={() => void startOAuth("oauth_github")}
            type="button"
            variant="secondary"
          >
            <Code2 className="h-4 w-4" aria-hidden="true" />
            {pendingStrategy === "oauth_github" ? t("loading") : t("signInWithGitHub")}
          </Button>
        </div>

        {hasError ? (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {t("error")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
