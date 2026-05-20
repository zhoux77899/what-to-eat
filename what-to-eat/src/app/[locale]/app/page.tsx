import { ImageIcon, Sparkles } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MEAL_IMAGE_MODEL, TEXT_RECOMMENDATION_MODEL } from "@/server/openai/models";

export default async function RecommendPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("recommend");

  return (
    <AppShell locale={locale}>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="space-y-4">
          <h1 className="text-3xl font-semibold">{t("title")}</h1>
          <Card className="space-y-4">
            <p className="text-muted-foreground">{t("description")}</p>
            <Button type="button">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {t("generate")}
            </Button>
          </Card>
        </section>
        <aside className="space-y-4">
          <Card className="space-y-3">
            <h2 className="text-lg font-semibold">{t("modelsTitle")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("textModel", { model: TEXT_RECOMMENDATION_MODEL })}
            </p>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <ImageIcon className="h-4 w-4" aria-hidden="true" />
              {t("imageModel", { model: MEAL_IMAGE_MODEL })}
            </p>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
