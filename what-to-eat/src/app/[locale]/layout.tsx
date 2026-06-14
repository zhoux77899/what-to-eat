import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import "@/app/globals.css";
import { AuthModalProvider } from "@/components/auth/auth-modal-provider";
import { AuthRuntimeProvider } from "@/components/auth/auth-runtime-provider";
import { routing } from "@/i18n/routing";
import { hasUsableClerkConfig } from "@/lib/clerk-config";

export const metadata: Metadata = {
  icons: {
    apple: [{ sizes: "512x512", type: "image/png", url: "/apple-icon.png" }],
    icon: [
      { sizes: "any", type: "image/x-icon", url: "/favicon.ico" },
      { sizes: "192x192", type: "image/png", url: "/brand/app-icon-192.png" },
      { sizes: "512x512", type: "image/png", url: "/brand/app-icon-512.png" },
      { sizes: "512x512", type: "image/png", url: "/icon.png" }
    ],
    shortcut: [{ type: "image/x-icon", url: "/favicon.ico" }]
  }
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const clerkEnabled = hasUsableClerkConfig();

  const app = (
    <NextIntlClientProvider messages={messages}>
      <AuthRuntimeProvider clerkEnabled={clerkEnabled}>
        <AuthModalProvider locale={locale}>{children}</AuthModalProvider>
      </AuthRuntimeProvider>
    </NextIntlClientProvider>
  );

  return (
    <html lang={locale}>
      <body>
        {clerkEnabled ? <ClerkProvider>{app}</ClerkProvider> : app}
      </body>
    </html>
  );
}
