import type { Thread, ThreadEvent } from "@openai/codex-sdk";
import { describe, expect, it, vi } from "vitest";

import {
  logLocalCodexProgress,
  runLocalCodexTurnWithProgress
} from "@/server/local-codex-progress";

const devEnv = {
  NODE_ENV: "development",
  LOCAL_CODEX_ENABLED: "true"
};

const ANSI = {
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  gray: "\x1b[90m",
  red: "\x1b[31m",
  reset: "\x1b[0m",
  yellow: "\x1b[33m"
};

function createEventStream(events: ThreadEvent[]) {
  return (async function* streamEvents() {
    for (const event of events) {
      yield event;
    }
  })();
}

function createThread(events: ThreadEvent[]) {
  return {
    runStreamed: vi.fn(async () => ({
      events: createEventStream(events)
    }))
  } as unknown as Thread;
}

describe("local Codex progress helper", () => {
  it("aggregates streamed events and emits colorized single-line progress logs", async () => {
    const logger = {
      info: vi.fn(),
      warn: vi.fn()
    };
    let currentTime = 1000;
    const now = vi.fn(() => {
      currentTime += 25;
      return currentTime;
    });
    const events: ThreadEvent[] = [
      { type: "thread.started", thread_id: "thread-1" },
      { type: "turn.started" },
      {
        type: "item.updated",
        item: {
          id: "command-1",
          type: "command_execution",
          command: "echo secret prompt",
          aggregated_output: "secret output",
          status: "in_progress"
        }
      },
      {
        type: "item.completed",
        item: {
          id: "message-1",
          type: "agent_message",
          text: "{\"dishes\":[]}"
        }
      },
      {
        type: "turn.completed",
        usage: {
          input_tokens: 11,
          cached_input_tokens: 2,
          output_tokens: 3,
          reasoning_output_tokens: 4
        }
      }
    ];
    const thread = createThread(events);

    const result = await runLocalCodexTurnWithProgress({
      thread,
      prompt: "do not log this prompt",
      task: "recommendation_text",
      runId: "run-1",
      environment: devEnv,
      logger,
      startedAtMs: 1000,
      now
    });

    expect(result.finalResponse).toBe("{\"dishes\":[]}");
    expect(result.usage?.input_tokens).toBe(11);
    expect(thread.runStreamed).toHaveBeenCalledWith("do not log this prompt", undefined);
    expect(logger.info.mock.calls.every((call) => call.length === 1)).toBe(true);
    expect(logger.info).toHaveBeenCalledWith(
      ` LOCAL-CODEX recommendation_text start ${ANSI.cyan}START${ANSI.reset} in 25ms ${ANSI.gray}(runId: run-1)${ANSI.reset}`
    );
    expect(logger.info).toHaveBeenCalledWith(
      ` LOCAL-CODEX recommendation_text item.updated ${ANSI.blue}RUNNING${ANSI.reset} in 100ms ${ANSI.gray}(runId: run-1, itemType: command_execution, status: in_progress)${ANSI.reset}`
    );
    expect(logger.info).toHaveBeenCalledWith(
      ` LOCAL-CODEX recommendation_text turn.completed ${ANSI.green}DONE${ANSI.reset} in 150ms ${ANSI.gray}(runId: run-1, inputTokens: 11, cachedInputTokens: 2, outputTokens: 3, reasoningOutputTokens: 4)${ANSI.reset}`
    );
    const loggedPayload = JSON.stringify(logger.info.mock.calls);
    expect(loggedPayload).not.toContain("[local-codex]");
    expect(loggedPayload).not.toContain("do not log this prompt");
    expect(loggedPayload).not.toContain("secret prompt");
    expect(loggedPayload).not.toContain("secret output");
    expect(loggedPayload).not.toContain("{\"dishes\":[]}");
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("throws when the streamed turn fails and logs a colorized failure summary", async () => {
    const logger = {
      info: vi.fn(),
      warn: vi.fn()
    };
    const thread = createThread([
      {
        type: "turn.failed",
        error: {
          message: "Codex failed while processing the local request"
        }
      }
    ]);

    await expect(
      runLocalCodexTurnWithProgress({
        thread,
        prompt: "request",
        task: "recommendation_text",
        runId: "run-2",
        environment: devEnv,
        logger,
        startedAtMs: 100,
        now: () => 160
      })
    ).rejects.toThrow("Codex failed while processing the local request");

    expect(logger.warn).toHaveBeenCalledWith(
      ` LOCAL-CODEX recommendation_text turn.failed ${ANSI.red}FAILED${ANSI.reset} in 60ms ${ANSI.gray}(runId: run-2, message: Codex failed while processing the local request)${ANSI.reset}`
    );
  });

  it("does not emit progress logs outside the local development gate", async () => {
    const logger = {
      info: vi.fn(),
      warn: vi.fn()
    };
    const thread = createThread([
      {
        type: "item.completed",
        item: {
          id: "message-1",
          type: "agent_message",
          text: "{\"dishes\":[]}"
        }
      }
    ]);

    await runLocalCodexTurnWithProgress({
      thread,
      prompt: "request",
      task: "recommendation_text",
        runId: "run-3",
        environment: {
          NODE_ENV: "production",
          LOCAL_CODEX_ENABLED: "true"
        },
      logger
    });

    expect(logger.info).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();

    await runLocalCodexTurnWithProgress({
      thread,
      prompt: "request",
      task: "recommendation_text",
      runId: "run-3",
      environment: {
        NODE_ENV: "development",
        LOCAL_CODEX_ENABLED: "true",
        VERCEL_ENV: "preview"
      },
      logger
    });

    expect(logger.info).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();

    await runLocalCodexTurnWithProgress({
      thread,
      prompt: "request",
      task: "recommendation_text",
      runId: "run-3",
      environment: {
        NODE_ENV: "development"
      },
      logger
    });

    expect(logger.info).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("logs image output stages with running and warning statuses", () => {
    const logger = {
      info: vi.fn(),
      warn: vi.fn()
    };

    logLocalCodexProgress({
      task: "image_generation",
      runId: "run-4",
      event: "output.prepared",
      metadata: {
        outputFile: "output.png"
      },
      environment: devEnv,
      logger,
      startedAtMs: 500,
      now: () => 575
    });

    expect(logger.info).toHaveBeenCalledWith(
      ` LOCAL-CODEX image_generation output.prepared ${ANSI.blue}RUNNING${ANSI.reset} in 75ms ${ANSI.gray}(runId: run-4, outputFile: output.png)${ANSI.reset}`
    );

    logLocalCodexProgress({
      task: "image_generation",
      runId: "run-4",
      event: "output.missing",
      level: "warn",
      environment: devEnv,
      logger,
      startedAtMs: 500,
      now: () => 600
    });

    expect(logger.warn).toHaveBeenCalledWith(
      ` LOCAL-CODEX image_generation output.missing ${ANSI.yellow}WARN${ANSI.reset} in 100ms ${ANSI.gray}(runId: run-4)${ANSI.reset}`
    );
  });
});
