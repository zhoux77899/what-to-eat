import { randomUUID } from "node:crypto";

import type {
  Input,
  RunResult,
  Thread,
  ThreadEvent,
  ThreadItem,
  TurnOptions,
  Usage
} from "@openai/codex-sdk";

type LocalCodexTask = "recommendation_text" | "image_generation";

type LocalCodexProgressEnvironment = Partial<
  Pick<NodeJS.ProcessEnv, "NODE_ENV" | "LOCAL_CODEX_ENABLED" | "VERCEL_ENV">
>;

type LocalCodexProgressLogger = Pick<typeof console, "info" | "warn">;

type SafeMetadataValue = string | number | boolean | null | undefined;
type LocalCodexProgressStatus = "START" | "RUNNING" | "DONE" | "WARN" | "FAILED";

const LOG_PREFIX = " LOCAL-CODEX";
const MAX_MESSAGE_LENGTH = 240;
const ANSI = {
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  gray: "\x1b[90m",
  red: "\x1b[31m",
  reset: "\x1b[0m",
  yellow: "\x1b[33m"
};
const STATUS_COLORS: Record<LocalCodexProgressStatus, string> = {
  START: ANSI.cyan,
  RUNNING: ANSI.blue,
  DONE: ANSI.green,
  WARN: ANSI.yellow,
  FAILED: ANSI.red
};

export function createLocalCodexRunId() {
  return randomUUID();
}

export async function runLocalCodexTurnWithProgress(input: {
  thread: Thread;
  prompt: Input;
  task: LocalCodexTask;
  runId?: string;
  turnOptions?: TurnOptions;
  environment?: LocalCodexProgressEnvironment;
  logger?: LocalCodexProgressLogger;
  startedAtMs?: number;
  now?: () => number;
}): Promise<RunResult> {
  const runId = input.runId ?? createLocalCodexRunId();
  const environment = input.environment ?? process.env;
  const logger = input.logger ?? console;
  const now = input.now ?? Date.now;
  const startedAtMs = input.startedAtMs ?? now();
  const items: ThreadItem[] = [];
  let finalResponse = "";
  let usage: Usage | null = null;
  let failure: Error | null = null;

  logLocalCodexProgress({
    task: input.task,
    runId,
    event: "start",
    environment,
    logger,
    startedAtMs,
    now
  });

  const streamed = await input.thread.runStreamed(input.prompt, input.turnOptions);

  for await (const event of streamed.events) {
    logThreadEvent({
      task: input.task,
      runId,
      event,
      environment,
      logger,
      startedAtMs,
      now
    });

    if (event.type === "item.completed") {
      if (event.item.type === "agent_message") {
        finalResponse = event.item.text;
      }

      items.push(event.item);
    } else if (event.type === "turn.completed") {
      usage = event.usage;
    } else if (event.type === "turn.failed") {
      failure = new Error(event.error.message);
      break;
    } else if (event.type === "error") {
      failure = new Error(event.message);
      break;
    }
  }

  if (failure) {
    throw failure;
  }

  return {
    items,
    finalResponse,
    usage
  };
}

export function logLocalCodexProgress(input: {
  task: LocalCodexTask;
  runId: string;
  event: string;
  level?: "info" | "warn";
  metadata?: Record<string, SafeMetadataValue>;
  environment?: LocalCodexProgressEnvironment;
  logger?: LocalCodexProgressLogger;
  startedAtMs?: number;
  now?: () => number;
}) {
  const environment = input.environment ?? process.env;

  if (!shouldLogLocalCodexProgress(environment)) {
    return;
  }

  const logger = input.logger ?? console;
  const now = input.now ?? Date.now;
  const startedAtMs = input.startedAtMs ?? now();
  const elapsedMs = Math.max(0, Math.round(now() - startedAtMs));
  const line = formatProgressLine({
    task: input.task,
    event: input.event,
    status: getProgressStatus(input.event, input.level),
    elapsedMs,
    metadata: {
      runId: input.runId,
      ...sanitizeMetadata(input.metadata)
    }
  });

  if (input.level === "warn") {
    logger.warn(line);
    return;
  }

  logger.info(line);
}

function formatProgressLine(input: {
  task: LocalCodexTask;
  event: string;
  status: LocalCodexProgressStatus;
  elapsedMs: number;
  metadata: Record<string, string | number | boolean | null>;
}) {
  return [
    LOG_PREFIX,
    input.task,
    input.event,
    colorizeStatus(input.status),
    `in ${input.elapsedMs}ms`,
    colorizeMetadata(input.metadata)
  ].join(" ");
}

function colorizeStatus(status: LocalCodexProgressStatus) {
  return `${STATUS_COLORS[status]}${status}${ANSI.reset}`;
}

function colorizeMetadata(metadata: Record<string, string | number | boolean | null>) {
  const body = Object.entries(metadata)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(", ");

  return `${ANSI.gray}(${body})${ANSI.reset}`;
}

function getProgressStatus(event: string, level?: "info" | "warn"): LocalCodexProgressStatus {
  if (event === "start") {
    return "START";
  }

  if (event === "turn.failed" || event === "error" || event === "failed") {
    return "FAILED";
  }

  if (event === "output.missing" || level === "warn") {
    return "WARN";
  }

  if (
    event === "item.completed" ||
    event === "turn.completed" ||
    event === "output.found" ||
    event === "output.processed"
  ) {
    return "DONE";
  }

  return "RUNNING";
}

function shouldLogLocalCodexProgress(environment: LocalCodexProgressEnvironment) {
  return (
    environment.NODE_ENV === "development" &&
    environment.LOCAL_CODEX_ENABLED === "true" &&
    !environment.VERCEL_ENV
  );
}

function logThreadEvent(input: {
  task: LocalCodexTask;
  runId: string;
  event: ThreadEvent;
  environment: LocalCodexProgressEnvironment;
  logger: LocalCodexProgressLogger;
  startedAtMs: number;
  now: () => number;
}) {
  switch (input.event.type) {
    case "thread.started":
      logLocalCodexProgress({
        ...input,
        event: "thread.started",
        metadata: {
          threadId: input.event.thread_id
        }
      });
      break;
    case "turn.started":
      logLocalCodexProgress({
        ...input,
        event: "turn.started"
      });
      break;
    case "item.started":
    case "item.updated":
    case "item.completed":
      logLocalCodexProgress({
        ...input,
        event: input.event.type,
        metadata: getSafeItemMetadata(input.event.item)
      });
      break;
    case "turn.completed":
      logLocalCodexProgress({
        ...input,
        event: "turn.completed",
        metadata: getUsageMetadata(input.event.usage)
      });
      break;
    case "turn.failed":
      logLocalCodexProgress({
        ...input,
        event: "turn.failed",
        level: "warn",
        metadata: {
          message: sanitizeText(input.event.error.message)
        }
      });
      break;
    case "error":
      logLocalCodexProgress({
        ...input,
        event: "error",
        level: "warn",
        metadata: {
          message: sanitizeText(input.event.message)
        }
      });
      break;
  }
}

function getSafeItemMetadata(item: ThreadItem): Record<string, SafeMetadataValue> {
  return {
    itemType: item.type,
    status: "status" in item && typeof item.status === "string" ? item.status : undefined
  };
}

function getUsageMetadata(usage: Usage): Record<string, SafeMetadataValue> {
  return {
    inputTokens: usage.input_tokens,
    cachedInputTokens: usage.cached_input_tokens,
    outputTokens: usage.output_tokens,
    reasoningOutputTokens: usage.reasoning_output_tokens
  };
}

function sanitizeMetadata(metadata: Record<string, SafeMetadataValue> = {}) {
  return Object.fromEntries(
    Object.entries(metadata).filter((entry): entry is [string, string | number | boolean | null] => {
      return entry[1] !== undefined;
    })
  );
}

function sanitizeText(value: string) {
  const singleLine = value.replace(/\s+/g, " ").trim();
  return singleLine.length > MAX_MESSAGE_LENGTH
    ? `${singleLine.slice(0, MAX_MESSAGE_LENGTH - 3)}...`
    : singleLine;
}
