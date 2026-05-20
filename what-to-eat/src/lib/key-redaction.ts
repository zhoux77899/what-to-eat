const VISIBLE_SUFFIX_LENGTH = 4;
const MINIMUM_SAFE_KEY_LENGTH = 12;

export function createKeyHint(apiKey: string) {
  return redactOpenAiApiKey(apiKey);
}

export function redactOpenAiApiKey(apiKey: string) {
  const trimmed = apiKey.trim();

  if (trimmed.length < MINIMUM_SAFE_KEY_LENGTH) {
    return "...";
  }

  return `...${trimmed.slice(-VISIBLE_SUFFIX_LENGTH)}`;
}
