export const LOCALES = ["zh", "en"] as const;
export const DEFAULT_LOCALE = "zh";

export type Locale = (typeof LOCALES)[number];

export function isSupportedLocale(value: string | undefined): value is Locale {
  return LOCALES.includes(value as Locale);
}

export function getLanguageName(locale: Locale) {
  return locale === "zh" ? "Chinese" : "English";
}
