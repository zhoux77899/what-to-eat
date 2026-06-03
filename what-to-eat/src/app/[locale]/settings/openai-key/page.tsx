import { getTranslations, setRequestLocale } from "next-intl/server";

import { AppShell } from "@/components/app-shell";
import { OpenAiKeyWorkbench } from "@/components/openai-key-workbench";

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
        <OpenAiKeyWorkbench />
      </section>
    </AppShell>
  );
}
