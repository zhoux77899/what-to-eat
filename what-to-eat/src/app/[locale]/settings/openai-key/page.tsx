import { ShieldCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function OpenAiKeyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("openAiKey");

  return (
    <AppShell locale={locale}>
      <section className="max-w-2xl space-y-4">
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <Card className="space-y-4">
          <p className="text-muted-foreground">{t("description")}</p>
          <label className="grid gap-2 text-sm font-medium">
            {t("fieldLabel")}
            <Input autoComplete="off" name="apiKey" placeholder={t("placeholder")} type="password" />
          </label>
          <div className="flex flex-wrap gap-3">
            <Button type="button">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              {t("save")}
            </Button>
            <Button type="button" variant="secondary">
              {t("validate")}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{t("imageVerificationNote")}</p>
        </Card>
      </section>
    </AppShell>
  );
}
