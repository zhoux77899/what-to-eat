const DUMMY_CLERK_PUBLISHABLE_KEY = "pk_test_dummy";
const DUMMY_CLERK_SECRET_KEY = "sk_test_dummy";
const publishableKeyPattern = /^(pk_test_|pk_live_)(.+)$/;
const secretKeyPattern = /^sk_(test|live)_.+/;

type ClerkEnv = {
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
  CLERK_SECRET_KEY?: string;
};

function decodeBase64Url(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);

  try {
    return globalThis.atob(`${base64}${padding}`);
  } catch {
    return null;
  }
}

export function isUsableClerkPublishableKey(value?: string | null) {
  const key = value?.trim();

  if (!key || key === DUMMY_CLERK_PUBLISHABLE_KEY) {
    return false;
  }

  const match = key.match(publishableKeyPattern);

  if (!match) {
    return false;
  }

  const decodedFrontendApi = decodeBase64Url(match[2]);

  if (!decodedFrontendApi?.endsWith("$")) {
    return false;
  }

  const frontendApi = decodedFrontendApi.slice(0, -1);
  return frontendApi.includes(".");
}

export function isUsableClerkSecretKey(value?: string | null) {
  const key = value?.trim();
  return Boolean(key && key !== DUMMY_CLERK_SECRET_KEY && secretKeyPattern.test(key));
}

export function hasUsableClerkConfig(
  env: ClerkEnv = {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY
  }
) {
  return (
    isUsableClerkPublishableKey(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
    isUsableClerkSecretKey(env.CLERK_SECRET_KEY)
  );
}
