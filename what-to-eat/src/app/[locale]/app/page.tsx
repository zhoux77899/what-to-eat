import { getTranslations, setRequestLocale } from "next-intl/server";

import { AppShell } from "@/components/app-shell";
import { RecommendWorkbench } from "@/components/recommend-workbench";

export default async function RecommendPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("recommend");

  return (
    <AppShell locale={locale}>
      <section className="app-page app-recommend-page">
        <h1 className="sr-only" id="recommend-page-title">
          {t("title")}
        </h1>
        <section className="app-recipe-board" aria-labelledby="recommend-page-title">
          <RecommendWorkbench />
        </section>
      </section>
    </AppShell>
  );
}
