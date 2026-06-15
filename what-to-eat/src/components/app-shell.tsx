"use client";

import { UserButton, useAuth, useUser } from "@clerk/nextjs";
import {
  ClipboardList,
  ChevronDown,
  History,
  KeyRound,
  Languages,
  Refrigerator,
  SlidersHorizontal
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuthModal } from "@/components/auth/auth-modal-provider";
import { useAuthRuntime } from "@/components/auth/auth-runtime-provider";
import { ProtectedLink } from "@/components/auth/protected-link";
import { BrandLogoImage } from "@/components/brand-assets";
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
  const brandLocale = locale === "en" ? "en" : "zh";
  const { clerkEnabled } = useAuthRuntime();
  const pathname = usePathname();

  const isCurrentPath = (href: string) => pathname === href;

  return (
    <div className="app-shell app-kitchen-page">
      <header className="app-shell-header">
        <div className="app-shell-header-inner">
          <Link className="app-shell-brand" href={`/${locale}`}>
            <BrandLogoImage label={t("brand")} locale={brandLocale} />
          </Link>
          <span className="app-shell-brand-divider" aria-hidden="true" />

          <nav aria-label={t("appNavigation")} className="app-shell-nav">
            <ProtectedLink
              className={cn(
                "home-paper-button app-nav-primary",
                isCurrentPath(`/${locale}/app`) && "app-nav-primary-active"
              )}
              href={`/${locale}/app`}
            >
              <ClipboardList className="app-nav-icon" aria-hidden="true" />
              <span className="home-paper-button-label">{t("menu")}</span>
            </ProtectedLink>

            <ProtectedLink
              className={cn(
                "home-paper-button app-nav-primary",
                isCurrentPath(`/${locale}/fridge`) && "app-nav-primary-active"
              )}
              href={`/${locale}/fridge`}
            >
              <Refrigerator className="app-nav-icon" aria-hidden="true" />
              <span className="home-paper-button-label">{t("fridge")}</span>
            </ProtectedLink>

            <details className="app-shell-menu">
              <summary className="home-paper-button app-menu-trigger">
                <span className="home-paper-button-label">{t("more")}</span>
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

          </nav>

          <div className="app-shell-actions">
            {clerkEnabled ? (
              <ClerkAuthActions
                defaultChefName={t("defaultChefName")}
                locale={locale}
                signInLabel={t("signIn")}
              />
            ) : (
              <LocalAuthActions locale={locale} signInLabel={t("signIn")} />
            )}
          </div>
        </div>
      </header>
      <main className="app-shell-main">{children}</main>
    </div>
  );
}

function ClerkAuthActions({
  defaultChefName,
  locale,
  signInLabel
}: {
  defaultChefName: string;
  locale: string;
  signInLabel: string;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { requestSignIn } = useAuthModal();
  const displayName = user?.fullName || user?.username || defaultChefName;

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
        <span className="app-user-name">{displayName}</span>
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
