import { AuthenticateWithRedirectCallback, ClerkProvider } from "@clerk/nextjs";

export default async function SsoCallbackPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const fallbackRedirectUrl = `/${locale}/app`;

  return (
    <ClerkProvider>
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl={fallbackRedirectUrl}
        signUpFallbackRedirectUrl={fallbackRedirectUrl}
      />
    </ClerkProvider>
  );
}
