import { getTranslations, setRequestLocale } from "next-intl/server";

import { AppShell } from "@/components/app-shell";
import { PreferencesWorkbench } from "@/components/preferences-workbench";

export default async function PreferencesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("preferences");

  return (
    <AppShell locale={locale}>
      <section className="app-page app-workbench-page">
        <div className="app-page-heading">
          <h1 className="app-page-title">{t("title")}</h1>
        </div>
        <PreferencesWorkbench locale={locale === "en" ? "en" : "zh"} />
      </section>
    </AppShell>
  );
}
