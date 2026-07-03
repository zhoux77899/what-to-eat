import { getTranslations, setRequestLocale } from "next-intl/server";
import { Languages, Sparkles } from "lucide-react";
import Link from "next/link";

import { ProtectedLink } from "@/components/auth/protected-link";
import { BrandLogoImage } from "@/components/brand-assets";

export default async function HomePage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const alternateLocale = locale === "zh" ? "en" : "zh";
  const serializedQuery = new URLSearchParams(
    Object.entries(query).flatMap(([key, value]) =>
      Array.isArray(value)
        ? value.map((entry) => [key, entry] as [string, string])
        : value === undefined
          ? []
          : [[key, value] as [string, string]]
    )
  ).toString();
  const localeHref = `/${alternateLocale}${serializedQuery ? `?${serializedQuery}` : ""}`;
  const brandLocale = locale === "en" ? "en" : "zh";
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const navigationT = await getTranslations("navigation");

  return (
    <main aria-label={t("pageLabel")} className="home-hero">
      <h1 className="sr-only">{t("title")}</h1>
      <Link
        aria-label={navigationT("language")}
        className="home-paper-button home-language-toggle"
        href={localeHref}
      >
        <Languages className="home-paper-button-icon" aria-hidden="true" />
        <span className="home-paper-button-label">{navigationT("language")}</span>
      </Link>
      <section className="home-hero-stage">
        <div className="home-hero-logo-card">
          <BrandLogoImage
            className="home-hero-logo"
            label={navigationT("brand")}
            locale={brandLocale}
          />
        </div>
        <ProtectedLink className="home-paper-button home-hero-cta" href={`/${locale}/app`}>
          <Sparkles className="home-paper-button-icon" aria-hidden="true" />
          <span className="home-paper-button-label home-hero-cta-label">{t("primaryAction")}</span>
        </ProtectedLink>
      </section>
      <aside aria-label={t("stepsLabel")} className="home-hero-steps">
        {[t("stepFridge"), t("stepRecommend"), t("stepCook")].map((step, index) => (
          <div className="home-hero-step" key={step}>
            <span className="home-hero-step-number" aria-hidden="true">
              {index + 1}
            </span>
            <span>{step}</span>
          </div>
        ))}
      </aside>
    </main>
  );
}
