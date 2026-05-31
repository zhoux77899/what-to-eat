"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import {
  ChevronDown,
  History,
  KeyRound,
  Languages,
  SlidersHorizontal,
  Sparkles,
  Utensils
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuthModal } from "@/components/auth/auth-modal-provider";
import { useAuthRuntime } from "@/components/auth/auth-runtime-provider";
import { ProtectedLink } from "@/components/auth/protected-link";
import { cn } from "@/lib/utils";

type AppShellProps = {
  locale: string;
  children: React.ReactNode;
};

export function AppShell({ locale, children }: AppShellProps) {
  return <AppShellContent locale={locale}>{children}</AppShellContent>;
}

function AppShellContent({ locale, children }: AppShellProps) {
  const t = useTranslations("navigation");
  const alternateLocale = locale === "zh" ? "en" : "zh";
  const { clerkEnabled } = useAuthRuntime();
  const pathname = usePathname();

  const isCurrentPath = (href: string) => pathname === href;

  return (
    <div className="app-shell">
      <header className="app-shell-header">
        <div className="app-shell-header-inner">
          <Link className="app-shell-brand" href={`/${locale}`}>
            <span className="app-shell-brand-mark" aria-hidden="true">
              <Utensils className="h-5 w-5" />
            </span>
            <span>{t("brand")}</span>
          </Link>

          <nav aria-label={t("appNavigation")} className="app-shell-nav">
            <ProtectedLink
              className={cn(
                "home-paper-button app-nav-primary",
                isCurrentPath(`/${locale}/app`) && "app-nav-primary-active"
              )}
              href={`/${locale}/app`}
            >
              <Sparkles className="app-nav-icon" aria-hidden="true" />
              <span className="home-paper-button-label">{t("recommend")}</span>
            </ProtectedLink>

            <details className="app-shell-menu">
              <summary className="home-paper-button app-menu-trigger">
                <span className="home-paper-button-label">{t("menu")}</span>
                <ChevronDown className="app-nav-icon app-menu-chevron" aria-hidden="true" />
              </summary>
              <div className="app-menu-panel">
                <ProtectedLink
                  className={cn(
                    "app-menu-link",
                    isCurrentPath(`/${locale}/preferences`) && "app-menu-link-active"
                  )}
                  href={`/${locale}/preferences`}
                >
                  <SlidersHorizontal className="app-menu-link-icon" aria-hidden="true" />
                  <span>{t("preferences")}</span>
                </ProtectedLink>
                <ProtectedLink
                  className={cn(
                    "app-menu-link",
                    isCurrentPath(`/${locale}/history`) && "app-menu-link-active"
                  )}
                  href={`/${locale}/history`}
                >
                  <History className="app-menu-link-icon" aria-hidden="true" />
                  <span>{t("history")}</span>
                </ProtectedLink>
                <ProtectedLink
                  className={cn(
                    "app-menu-link",
                    isCurrentPath(`/${locale}/settings/openai-key`) && "app-menu-link-active"
                  )}
                  href={`/${locale}/settings/openai-key`}
                >
                  <KeyRound className="app-menu-link-icon" aria-hidden="true" />
                  <span>{t("openAiKey")}</span>
                </ProtectedLink>
                <Link className="app-menu-link" href={`/${alternateLocale}`}>
                  <Languages className="app-menu-link-icon" aria-hidden="true" />
                  <span>{t("language")}</span>
                </Link>
              </div>
            </details>

            {clerkEnabled ? (
              <ClerkAuthActions locale={locale} signInLabel={t("signIn")} />
            ) : (
              <LocalAuthActions locale={locale} signInLabel={t("signIn")} />
            )}
          </nav>
        </div>
      </header>
      <main className="app-shell-main">{children}</main>
    </div>
  );
}

function ClerkAuthActions({ locale, signInLabel }: { locale: string; signInLabel: string }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { requestSignIn } = useAuthModal();

  if (isLoaded && !isSignedIn) {
    return (
      <button
        className="home-paper-button app-sign-in-button"
        onClick={() => requestSignIn(`/${locale}/app`)}
        type="button"
      >
        <span className="home-paper-button-label">{signInLabel}</span>
      </button>
    );
  }

  if (isLoaded && isSignedIn) {
    return (
      <div className="app-user-button">
        <UserButton />
      </div>
    );
  }

  return null;
}

function LocalAuthActions({ locale, signInLabel }: { locale: string; signInLabel: string }) {
  const { requestSignIn } = useAuthModal();

  return (
    <button
      className="home-paper-button app-sign-in-button"
      onClick={() => requestSignIn(`/${locale}/app`)}
      type="button"
    >
      <span className="home-paper-button-label">{signInLabel}</span>
    </button>
  );
}
