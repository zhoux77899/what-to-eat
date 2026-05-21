import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default async function SsoCallbackPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const fallbackRedirectUrl = `/${locale}/app`;

  return (
    <AuthenticateWithRedirectCallback
      signInFallbackRedirectUrl={fallbackRedirectUrl}
      signUpFallbackRedirectUrl={fallbackRedirectUrl}
    />
  );
}
