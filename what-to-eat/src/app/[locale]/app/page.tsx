import { Sparkles } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

export default async function RecommendPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("recommend");

  return (
    <AppShell locale={locale}>
      <section className="app-page app-table-page app-table-page-minimal">
        <h1 className="sr-only" id="recommend-page-title">
          {t("title")}
        </h1>

        <section className="app-table-canvas app-table-canvas-minimal" aria-labelledby="recommend-page-title">
          <div className="app-table-plate" aria-hidden="true">
            <span className="app-table-plate-shadow" />
            <span className="app-table-plate-rim" />
            <span className="app-table-plate-bowl" />
            <span className="app-table-chopstick app-table-chopstick-left" />
            <span className="app-table-chopstick app-table-chopstick-right" />
          </div>

          <div className="app-action-row app-table-action-row">
            <Button className="home-paper-button app-paper-button-primary app-table-button" type="button">
              <Sparkles className="app-button-icon" aria-hidden="true" />
              <span className="home-paper-button-label">{t("generate")}</span>
            </Button>
          </div>
        </section>
      </section>
    </AppShell>
  );
}
