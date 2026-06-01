import { getTranslations, setRequestLocale } from "next-intl/server";

import { AppShell } from "@/components/app-shell";
import { RecommendWorkbench } from "@/components/recommend-workbench";

export default async function RecommendPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("recommend");

  return (
    <AppShell locale={locale}>
      <section className="app-page app-table-page">
        <h1 className="sr-only" id="recommend-page-title">
          {t("title")}
        </h1>
        <section className="app-table-canvas" aria-labelledby="recommend-page-title">
          <div className="app-table-plate" aria-hidden="true">
            <span className="app-table-plate-shadow" />
            <span className="app-table-plate-rim" />
            <span className="app-table-plate-bowl" />
            <span className="app-table-chopstick app-table-chopstick-left" />
            <span className="app-table-chopstick app-table-chopstick-right" />
          </div>
          <div className="relative z-10 w-full">
            <RecommendWorkbench />
          </div>
        </section>
      </section>
    </AppShell>
  );
}
