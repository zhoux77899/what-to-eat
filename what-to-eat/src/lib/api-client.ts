export class ApiClientError extends Error {
  constructor(public readonly messageKey: string) {
    super(messageKey);
    this.name = "ApiClientError";
  }
}

export async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = (await response.json().catch(() => null)) as
    | { data?: T; error?: { messageKey?: string } }
    | null;

  if (!response.ok || !payload?.data) {
    throw new ApiClientError(payload?.error?.messageKey ?? "errors.configurationError");
  }

  return payload.data;
}

export function getErrorTranslationKey(error: unknown) {
  const messageKey =
    error instanceof ApiClientError ? error.messageKey : "errors.configurationError";

  return messageKey.replace(/^errors\./, "");
}
