export const IMAGE_STATUS_POLL_INTERVAL_MS = 2_500;

export type ClientImageStatus = "pending" | "succeeded" | "failed" | null;

export type ClientImageRecord = {
  status: ClientImageStatus;
  deadlineAt: string | null;
};

export function resolveClientImageStatus(
  status: ClientImageStatus,
  deadlineAt: string | null,
  nowMs = Date.now()
) {
  if (status !== "pending") {
    return status;
  }

  return isImageDeadlineElapsed(deadlineAt, nowMs) ? "failed" : status;
}

export function getImageStatusPollDelay(
  records: ClientImageRecord[],
  nowMs = Date.now(),
  intervalMs = IMAGE_STATUS_POLL_INTERVAL_MS
) {
  const pendingRecords = records.filter((record) => record.status === "pending");

  if (pendingRecords.length === 0) {
    return null;
  }

  const deadlineDelays = pendingRecords
    .map((record) => getImageDeadlineDelay(record.deadlineAt, nowMs))
    .filter((delay) => delay !== null);

  if (deadlineDelays.some((delay) => delay <= 0)) {
    return 0;
  }

  const nextDeadlineDelay = deadlineDelays.length > 0 ? Math.min(...deadlineDelays) : intervalMs;
  return Math.max(0, Math.min(intervalMs, nextDeadlineDelay));
}

function isImageDeadlineElapsed(deadlineAt: string | null, nowMs: number) {
  const delay = getImageDeadlineDelay(deadlineAt, nowMs);
  return delay !== null && delay <= 0;
}

function getImageDeadlineDelay(deadlineAt: string | null, nowMs: number) {
  if (!deadlineAt) {
    return null;
  }

  const deadlineMs = Date.parse(deadlineAt);
  return Number.isFinite(deadlineMs) ? deadlineMs - nowMs : null;
}
