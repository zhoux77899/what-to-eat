import { getTranslations, setRequestLocale } from "next-intl/server";

import { AppShell } from "@/components/app-shell";
import { HistoryWorkbench } from "@/components/history-workbench";

export default async function HistoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("history");

  return (
    <AppShell locale={locale}>
      <section className="app-page app-workbench-page">
        <div className="app-page-heading">
          <h1 className="app-page-title" id="history-page-title" tabIndex={-1}>
            {t("title")}
          </h1>
        </div>
        <section className="app-workbench-surface">
          <HistoryWorkbench locale={locale} />
        </section>
      </section>
    </AppShell>
  );
}
