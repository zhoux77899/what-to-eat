import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { hasUsableClerkConfig } from "@/lib/clerk-config";

export default async function SsoCallbackPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (!hasUsableClerkConfig()) {
    const t = await getTranslations("auth");

    return (
      <main className="mx-auto max-w-xl px-4 py-12">
        <p className="rounded border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
          {t("configurationError")}
        </p>
      </main>
    );
  }

  const fallbackRedirectUrl = `/${locale}/app`;
  const t = await getTranslations("auth");

  return (
    <main className="mx-auto grid min-h-screen max-w-xl place-items-center px-4 py-12">
      <div className="grid gap-4 text-center">
        <p className="text-sm text-muted-foreground">{t("callbackLoading")}</p>
        <div id="clerk-captcha" />
        <AuthenticateWithRedirectCallback
          signInFallbackRedirectUrl={fallbackRedirectUrl}
          signUpFallbackRedirectUrl={fallbackRedirectUrl}
        />
      </div>
    </main>
  );
}
