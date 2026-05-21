"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import { KeyRound, Languages, Utensils } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { useAuthModal } from "@/components/auth/auth-modal-provider";
import { ProtectedLink } from "@/components/auth/protected-link";
import { Button } from "@/components/ui/button";

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
  const { isLoaded, isSignedIn } = useAuth();
  const { requestSignIn } = useAuthModal();

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link className="flex items-center gap-2 font-semibold" href={`/${locale}`}>
            <Utensils className="h-5 w-5 text-primary" aria-hidden="true" />
            <span>{t("brand")}</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <ProtectedLink href={`/${locale}/app`}>{t("recommend")}</ProtectedLink>
            </Button>
            <Button asChild variant="ghost">
              <ProtectedLink href={`/${locale}/settings/openai-key`}>
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                {t("openAiKey")}
              </ProtectedLink>
            </Button>
            <Button asChild variant="ghost">
              <Link href={`/${alternateLocale}`}>
                <Languages className="h-4 w-4" aria-hidden="true" />
                {t("language")}
              </Link>
            </Button>
            {isLoaded && !isSignedIn ? (
              <Button onClick={() => requestSignIn(`/${locale}/app`)}>{t("signIn")}</Button>
            ) : null}
            {isLoaded && isSignedIn ? (
              <UserButton />
            ) : null}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
