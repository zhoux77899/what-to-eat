export const IMAGE_GENERATION_TIMEOUT_MS = 270_000;
export const IMAGE_GENERATION_STALE_GRACE_MS = 30_000;
export const IMAGE_GENERATION_TIMED_OUT = "IMAGE_GENERATION_TIMED_OUT";
export const IMAGE_GENERATION_SUPERSEDED = "IMAGE_GENERATION_SUPERSEDED";
export const IMAGE_GENERATION_FAILED = "IMAGE_GENERATION_FAILED";

export function getImageDeadlineAt(input: {
  createdAt: Date | string | null;
  status: "pending" | "succeeded" | "failed" | null;
}) {
  if (input.status !== "pending" || !input.createdAt) {
    return null;
  }

  return new Date(new Date(input.createdAt).getTime() + IMAGE_GENERATION_TIMEOUT_MS).toISOString();
}

export function getTimedOutImageCutoff(now = new Date()) {
  return new Date(
    now.getTime() - IMAGE_GENERATION_TIMEOUT_MS - IMAGE_GENERATION_STALE_GRACE_MS
  );
}
