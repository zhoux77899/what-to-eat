import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AppIconImage } from "@/components/brand-assets";
import { hasUsableClerkConfig } from "@/lib/clerk-config";

export default async function SsoCallbackPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (!hasUsableClerkConfig()) {
    const t = await getTranslations("auth");

    return (
      <main className="app-kitchen-page sso-callback-page">
        <section className="sso-callback-card app-kitchen-panel" aria-labelledby="sso-callback-title">
          <AppIconImage className="sso-callback-icon" label={t("title")} />
          <h1 className="sr-only" id="sso-callback-title">
            {t("title")}
          </h1>
          <p className="auth-modal-error" role="alert">
            {t("configurationError")}
          </p>
        </section>
      </main>
    );
  }

  const fallbackRedirectUrl = `/${locale}/app`;
  const t = await getTranslations("auth");

  return (
    <main className="app-kitchen-page sso-callback-page">
      <section className="sso-callback-card app-kitchen-panel" aria-labelledby="sso-callback-title">
        <AppIconImage className="sso-callback-icon" label={t("title")} />
        <div className="sso-callback-copy">
          <h1 className="sr-only" id="sso-callback-title">
            {t("title")}
          </h1>
          <p className="app-page-description">{t("callbackLoading")}</p>
        </div>
        <div id="clerk-captcha" />
        <AuthenticateWithRedirectCallback
          signInFallbackRedirectUrl={fallbackRedirectUrl}
          signUpFallbackRedirectUrl={fallbackRedirectUrl}
        />
      </section>
    </main>
  );
}
