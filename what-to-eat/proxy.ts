import { clerkMiddleware } from "@clerk/nextjs/server";
import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";

import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

function hasUsableClerkConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      process.env.CLERK_SECRET_KEY &&
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== "pk_test_dummy" &&
      process.env.CLERK_SECRET_KEY !== "sk_test_dummy"
  );
}

function isProtectedPath(pathname: string) {
  return /^\/(zh|en)\/(app|settings|preferences|history)(\/|$)/.test(pathname);
}

function isApiPath(pathname: string) {
  return pathname.startsWith("/api");
}

function isClerkInternalPath(pathname: string) {
  return pathname.startsWith("/__clerk");
}

function getLocaleFromPath(pathname: string) {
  const locale = pathname.split("/")[1];
  return routing.locales.includes(locale as (typeof routing.locales)[number])
    ? locale
    : routing.defaultLocale;
}

function getAuthRedirectUrl(request: Parameters<typeof intlMiddleware>[0]) {
  const locale = getLocaleFromPath(request.nextUrl.pathname);
  const redirectUrl = new URL(`/${locale}`, request.url);

  redirectUrl.searchParams.set("signIn", "1");
  redirectUrl.searchParams.set("returnTo", `${request.nextUrl.pathname}${request.nextUrl.search}`);

  return redirectUrl;
}

const localFallbackProxy = (request: Parameters<typeof intlMiddleware>[0]) => {
  if (isApiPath(request.nextUrl.pathname) || isClerkInternalPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (isProtectedPath(request.nextUrl.pathname)) {
    return NextResponse.redirect(getAuthRedirectUrl(request));
  }

  return intlMiddleware(request);
};

const clerkProxy = clerkMiddleware(async (auth, request) => {
  if (isProtectedPath(request.nextUrl.pathname)) {
    const session = await auth();

    if (!session.userId) {
      return NextResponse.redirect(getAuthRedirectUrl(request));
    }
  }

  if (isApiPath(request.nextUrl.pathname) || isClerkInternalPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  return intlMiddleware(request);
});

const activeProxy = hasUsableClerkConfig() ? clerkProxy : localFallbackProxy;

export default activeProxy;

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)", "/api/(.*)", "/__clerk/(.*)"]
};
