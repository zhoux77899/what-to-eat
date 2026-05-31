import { ShieldCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function OpenAiKeyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("openAiKey");

  return (
    <AppShell locale={locale}>
      <section className="app-page app-workbench-page">
        <div className="app-page-heading">
          <h1 className="app-page-title">{t("title")}</h1>
        </div>

        <section className="app-workbench-surface app-workbench-form">
          <p className="app-page-description">{t("description")}</p>
          <label className="app-form-field">
            {t("fieldLabel")}
            <Input
              autoComplete="off"
              className="app-paper-input"
              name="apiKey"
              placeholder={t("placeholder")}
              type="password"
            />
          </label>
          <div className="app-action-row">
            <Button className="home-paper-button app-paper-button-primary" type="button">
              <ShieldCheck className="app-button-icon" aria-hidden="true" />
              <span className="home-paper-button-label">{t("save")}</span>
            </Button>
            <Button
              className="home-paper-button app-paper-button-secondary"
              type="button"
              variant="secondary"
            >
              <span className="home-paper-button-label">{t("validate")}</span>
            </Button>
          </div>
          <p className="app-muted-text">{t("imageVerificationNote")}</p>
        </section>
      </section>
    </AppShell>
  );
}
