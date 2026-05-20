import { getTranslations, setRequestLocale } from "next-intl/server";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";

export default async function PreferencesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("preferences");

  return (
    <AppShell locale={locale}>
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <Card>
          <p className="text-muted-foreground">{t("empty")}</p>
        </Card>
      </section>
    </AppShell>
  );
}
