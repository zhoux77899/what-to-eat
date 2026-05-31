export const BUSINESS_ERROR_CODES = [
  "UNAUTHENTICATED",
  "VALIDATION_ERROR",
  "MISSING_OPENAI_KEY",
  "INVALID_OPENAI_KEY",
  "RATE_LIMITED",
  "MODEL_RESPONSE_INVALID",
  "UPSTREAM_OPENAI_ERROR",
  "CONFIGURATION_ERROR",
  "NOT_IMPLEMENTED"
] as const;

export type BusinessErrorCode = (typeof BUSINESS_ERROR_CODES)[number];

export const ERROR_MESSAGE_KEYS: Record<BusinessErrorCode, `errors.${string}`> = {
  UNAUTHENTICATED: "errors.unauthenticated",
  VALIDATION_ERROR: "errors.validationError",
  MISSING_OPENAI_KEY: "errors.missingOpenAiKey",
  INVALID_OPENAI_KEY: "errors.invalidOpenAiKey",
  RATE_LIMITED: "errors.rateLimited",
  MODEL_RESPONSE_INVALID: "errors.modelResponseInvalid",
  UPSTREAM_OPENAI_ERROR: "errors.upstreamOpenAiError",
  CONFIGURATION_ERROR: "errors.configurationError",
  NOT_IMPLEMENTED: "errors.notImplemented"
};

export function getHttpStatusForError(code: BusinessErrorCode) {
  switch (code) {
    case "UNAUTHENTICATED":
      return 401;
    case "VALIDATION_ERROR":
      return 400;
    case "MISSING_OPENAI_KEY":
    case "INVALID_OPENAI_KEY":
    case "CONFIGURATION_ERROR":
      return 409;
    case "RATE_LIMITED":
      return 429;
    case "UPSTREAM_OPENAI_ERROR":
      return 502;
    case "MODEL_RESPONSE_INVALID":
      return 422;
    case "NOT_IMPLEMENTED":
      return 501;
  }
}
