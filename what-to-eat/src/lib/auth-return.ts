import { routing } from "@/i18n/routing";

const protectedRoutePattern = /^\/(zh|en)\/(app|settings|preferences|history)(\/|$)/;
const localOrigin = "https://what-to-eat.local";

export function getDefaultAuthReturnTo(locale: string) {
  const safeLocale = routing.locales.includes(locale as (typeof routing.locales)[number])
    ? locale
    : routing.defaultLocale;

  return `/${safeLocale}/app`;
}

export function normalizeAuthReturnTo(locale: string, returnTo?: string | null) {
  const fallback = getDefaultAuthReturnTo(locale);

  if (!returnTo) {
    return fallback;
  }

  const trimmed = returnTo.trim();

  if (!trimmed || trimmed.includes("\\")) {
    return fallback;
  }

  try {
    const target = new URL(trimmed, localOrigin);

    if (target.origin !== localOrigin) {
      return fallback;
    }

    if (!target.pathname.startsWith(`/${locale}/`)) {
      return fallback;
    }

    if (!protectedRoutePattern.test(target.pathname)) {
      return fallback;
    }

    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}
