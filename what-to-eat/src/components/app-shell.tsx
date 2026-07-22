"use client";

import { UserButton, useAuth, useUser } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { useAuthModal } from "@/components/auth/auth-modal-provider";
import { useAuthRuntime } from "@/components/auth/auth-runtime-provider";
import { ProtectedLink } from "@/components/auth/protected-link";
import { BrandLogoImage } from "@/components/brand-assets";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { ButtonSkin } from "@/components/ui/button-skin";
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
  const localePath = pathname.replace(/^\/(zh|en)(?=\/|$)/, `/${alternateLocale}`);

  const isCurrentPath = (href: string) => pathname === href;
  const isMorePath =
    isCurrentPath(`/${locale}/preferences`) ||
    isCurrentPath(`/${locale}/settings/openai-key`);

  return (
    <div className="app-shell app-kitchen-page">
      <header className="app-shell-header">
        <div className="app-shell-header-inner">
          <Link className="app-shell-brand" href={`/${locale}`}>
            <BrandLogoImage label={t("brand")} locale={brandLocale} />
          </Link>
          <span className="app-shell-brand-divider" aria-hidden="true" />

          <nav aria-label={t("appNavigation")} className="app-shell-nav">
            <Button
              asChild
              size="compact"
              variant={isCurrentPath(`/${locale}/app`) ? "primary" : "secondary"}
            >
              <ProtectedLink
                aria-current={isCurrentPath(`/${locale}/app`) ? "page" : undefined}
                className="app-nav-primary"
                href={`/${locale}/app`}
              >
                <AppIcon className="app-nav-icon" name="recommend" />
                <span className="home-paper-button-label">{t("recommend")}</span>
              </ProtectedLink>
            </Button>

            <Button
              asChild
              size="compact"
              variant={isCurrentPath(`/${locale}/fridge`) ? "primary" : "secondary"}
            >
              <ProtectedLink
                aria-current={isCurrentPath(`/${locale}/fridge`) ? "page" : undefined}
                className="app-nav-primary"
                href={`/${locale}/fridge`}
              >
                <AppIcon className="app-nav-icon" name="fridge" />
                <span className="home-paper-button-label">{t("fridge")}</span>
              </ProtectedLink>
            </Button>

            <Button
              asChild
              size="compact"
              variant={isCurrentPath(`/${locale}/history`) ? "primary" : "secondary"}
            >
              <ProtectedLink
                aria-current={isCurrentPath(`/${locale}/history`) ? "page" : undefined}
                className="app-nav-primary"
                href={`/${locale}/history`}
              >
                <AppIcon className="app-nav-icon" name="history" />
                <span className="home-paper-button-label">{t("history")}</span>
              </ProtectedLink>
            </Button>

            <details className="app-shell-menu">
              <Button asChild size="compact" variant={isMorePath ? "primary" : "secondary"}>
                <summary
                  aria-current={isMorePath ? "page" : undefined}
                  className="app-menu-trigger"
                >
                  <span className="home-paper-button-label">{t("more")}</span>
                  <AppIcon className="app-nav-icon app-menu-chevron" name="chevron-down" />
                </summary>
              </Button>
              <div className="app-menu-panel">
                <ProtectedLink
                  aria-current={
                    isCurrentPath(`/${locale}/preferences`) ? "page" : undefined
                  }
                  className={cn(
                    "app-menu-link",
                    isCurrentPath(`/${locale}/preferences`) && "app-menu-link-active"
                  )}
                  href={`/${locale}/preferences`}
                >
                  <AppIcon className="app-menu-link-icon" name="preferences" />
                  <span>{t("preferences")}</span>
                </ProtectedLink>
                <ProtectedLink
                  aria-current={
                    isCurrentPath(`/${locale}/settings/openai-key`) ? "page" : undefined
                  }
                  className={cn(
                    "app-menu-link",
                    isCurrentPath(`/${locale}/settings/openai-key`) && "app-menu-link-active"
                  )}
                  href={`/${locale}/settings/openai-key`}
                >
                  <AppIcon className="app-menu-link-icon" name="api-key" />
                  <span>{t("openAiKey")}</span>
                </ProtectedLink>
                <Suspense fallback={<LocaleSwitchFallback label={t("language")} />}>
                  <LocaleSwitchLinkWithSearch href={localePath} label={t("language")} />
                </Suspense>
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
      <nav aria-label={t("mobileNavigation")} className="app-mobile-nav">
        <ProtectedLink
          aria-current={isCurrentPath(`/${locale}/app`) ? "page" : undefined}
          className={cn(
            "app-mobile-nav-link",
            isCurrentPath(`/${locale}/app`) && "app-mobile-nav-link-active"
          )}
          href={`/${locale}/app`}
        >
          <AppIcon className="app-mobile-nav-icon" name="recommend" />
          <span>{t("recommend")}</span>
        </ProtectedLink>
        <ProtectedLink
          aria-current={isCurrentPath(`/${locale}/fridge`) ? "page" : undefined}
          className={cn(
            "app-mobile-nav-link",
            isCurrentPath(`/${locale}/fridge`) && "app-mobile-nav-link-active"
          )}
          href={`/${locale}/fridge`}
        >
          <AppIcon className="app-mobile-nav-icon" name="fridge" />
          <span>{t("fridge")}</span>
        </ProtectedLink>
        <ProtectedLink
          aria-current={isCurrentPath(`/${locale}/history`) ? "page" : undefined}
          className={cn(
            "app-mobile-nav-link",
            isCurrentPath(`/${locale}/history`) && "app-mobile-nav-link-active"
          )}
          href={`/${locale}/history`}
        >
          <AppIcon className="app-mobile-nav-icon" name="history" />
          <span>{t("history")}</span>
        </ProtectedLink>
        <details className="app-mobile-more">
          <summary
            aria-current={isMorePath ? "page" : undefined}
            className={cn("app-mobile-nav-link", isMorePath && "app-mobile-nav-link-active")}
          >
            <AppIcon className="app-mobile-nav-icon" name="more" />
            <span>{t("more")}</span>
          </summary>
          <div className="app-mobile-more-panel">
            <ProtectedLink
              aria-current={isCurrentPath(`/${locale}/preferences`) ? "page" : undefined}
              className={cn(
                "app-menu-link",
                isCurrentPath(`/${locale}/preferences`) && "app-menu-link-active"
              )}
              href={`/${locale}/preferences`}
            >
              <AppIcon className="app-menu-link-icon" name="preferences" />
              <span>{t("preferences")}</span>
            </ProtectedLink>
            <ProtectedLink
              aria-current={
                isCurrentPath(`/${locale}/settings/openai-key`) ? "page" : undefined
              }
              className={cn(
                "app-menu-link",
                isCurrentPath(`/${locale}/settings/openai-key`) && "app-menu-link-active"
              )}
              href={`/${locale}/settings/openai-key`}
            >
              <AppIcon className="app-menu-link-icon" name="api-key" />
              <span>{t("openAiKey")}</span>
            </ProtectedLink>
            <Suspense fallback={<LocaleSwitchFallback label={t("language")} />}>
              <LocaleSwitchLinkWithSearch href={localePath} label={t("language")} />
            </Suspense>
            <div className="app-mobile-account">
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
        </details>
      </nav>
    </div>
  );
}

function LocaleSwitchLinkWithSearch({ href, label }: { href: string; label: string }) {
  const search = useSearchParams().toString();
  return <LocaleSwitchLink href={`${href}${search ? `?${search}` : ""}`} label={label} />;
}

function LocaleSwitchLink({ href, label }: { href: string; label: string }) {
  return (
    <Link className="app-menu-link" href={href}>
      <AppIcon className="app-menu-link-icon" name="language" />
      <span>{label}</span>
    </Link>
  );
}

function LocaleSwitchFallback({ label }: { label: string }) {
  return (
    <span className="app-menu-link" aria-disabled="true">
      <AppIcon className="app-menu-link-icon" name="language" />
      <span>{label}</span>
    </span>
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
      <Button
        className="app-sign-in-button"
        onClick={() => requestSignIn(`/${locale}/app`)}
        size="compact"
        type="button"
        variant="secondary"
      >
        <span className="home-paper-button-label">{signInLabel}</span>
      </Button>
    );
  }

  if (isLoaded && isSignedIn) {
    return (
      <div className="app-button-surface app-user-button">
        <ButtonSkin tone="secondary" />
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
    <Button
      className="app-sign-in-button"
      onClick={() => requestSignIn(`/${locale}/app`)}
      size="compact"
      type="button"
      variant="secondary"
    >
      <span className="home-paper-button-label">{signInLabel}</span>
    </Button>
  );
}
