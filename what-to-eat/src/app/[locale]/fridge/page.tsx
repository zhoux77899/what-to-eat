import { getTranslations, setRequestLocale } from "next-intl/server";

import { AppShell } from "@/components/app-shell";
import { FridgeWorkbench } from "@/components/fridge-workbench";

export default async function FridgePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("fridge");

  return (
    <AppShell locale={locale}>
      <section className="app-page app-workbench-page">
        <div className="app-page-heading">
          <h1 className="app-page-title">{t("title")}</h1>
          <p className="app-page-description">{t("description")}</p>
        </div>
        <FridgeWorkbench />
      </section>
    </AppShell>
  );
}
