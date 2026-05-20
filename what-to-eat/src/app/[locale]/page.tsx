import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";

function HomeButtonIcon() {
  return (
    <svg
      aria-hidden="true"
      className="home-paper-button-icon"
      fill="none"
      height="64"
      viewBox="0 0 64 64"
      width="64"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g className="home-paper-button-icon-mark">
        <path
          className="home-paper-button-icon-rice"
          d="M14.3 32.6c-.6-3.4 2.4-6.1 6.1-6.5.9-4 5.8-6.7 10.7-4.6 3.2-4.8 10.8-3.6 12.5 1.9 4-.7 7.5 1.8 7.6 5.9 3.3.4 5.7 2.5 5.7 5.6 0 4.3-4.5 7.7-10.1 7.7H22.6c-5.2 0-8.4-4.1-8.3-10Z"
          pathLength="1"
        />
        <path
          className="home-paper-button-icon-bowl"
          d="M9.7 33.1c1.4 14.2 10.1 21.3 22.3 21.3s20.9-7.1 22.3-21.3c-2.9 3.1-11.2 5.3-22.3 5.3S12.6 36.2 9.7 33.1Z"
          pathLength="1"
        />
        <path
          className="home-paper-button-icon-bowl-lip"
          d="M9.5 32.8c2.9 4.1 11.3 6.5 22.5 6.5s19.6-2.4 22.5-6.5"
          pathLength="1"
        />
        <path className="home-paper-button-icon-bowl-foot" d="M24.3 53.6c.6 3.3 3.2 5.2 7.7 5.2s7.1-1.9 7.7-5.2" pathLength="1" />
        <path className="home-paper-button-icon-bowl-petal" d="M18.7 43.4c-2.4 1.2-2.1 5.9 1.5 8.4" pathLength="1" />
        <path className="home-paper-button-icon-bowl-petal" d="M26.5 44.5c-2 1.9-2 5.1.2 8.1" pathLength="1" />
        <path className="home-paper-button-icon-bowl-petal" d="M37.5 44.5c2 1.9 2 5.1-.2 8.1" pathLength="1" />
        <path className="home-paper-button-icon-bowl-petal" d="M45.3 43.4c2.4 1.2 2.1 5.9-1.5 8.4" pathLength="1" />
        <path
          className="home-paper-button-icon-rice-mark"
          d="M20.8 32.9c.6-1.5 2.8-2.1 4.3-.9"
          pathLength="1"
        />
        <path
          className="home-paper-button-icon-rice-mark"
          d="M30 28.2c.8-1.5 3-1.7 4.3-.4"
          pathLength="1"
        />
        <path
          className="home-paper-button-icon-rice-mark"
          d="M42.6 34c.9-1.2 2.8-1.3 4 .1"
          pathLength="1"
        />
        <path
          className="home-paper-button-icon-chopstick"
          d="M41.2 5.6c2.2.5 3.1 2.2 2.4 4.2L36.4 33c-.4 1.3-1.4 2-2.5 1.7-1.1-.3-1.6-1.4-1.3-2.7l6-23.6c.5-2 1.2-3.2 2.6-2.8Z"
          pathLength="1"
        />
        <path
          className="home-paper-button-icon-chopstick"
          d="M50.8 8.6c2 .8 2.6 2.6 1.6 4.5L41.1 34c-.6 1.2-1.7 1.7-2.7 1.2-1-.5-1.3-1.7-.7-2.9L47.3 11c.8-1.8 2.1-2.9 3.5-2.4Z"
          pathLength="1"
        />
      </g>
    </svg>
  );
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const alternateLocale = locale === "zh" ? "en" : "zh";
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const navigationT = await getTranslations("navigation");

  return (
    <main aria-label={t("pageLabel")} className="home-hero">
      <h1 className="sr-only">{t("title")}</h1>
      <Link
        aria-label={navigationT("language")}
        className="home-paper-button home-language-toggle"
        href={`/${alternateLocale}`}
      >
        <HomeButtonIcon />
        <span className="home-paper-button-label">{navigationT("language")}</span>
      </Link>
      <Link className="home-paper-button home-hero-cta" href={`/${locale}/app`}>
        <HomeButtonIcon />
        <span className="home-paper-button-label home-hero-cta-label">{t("primaryAction")}</span>
      </Link>
    </main>
  );
}
