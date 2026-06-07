import type { ThreadEvent } from "@openai/codex-sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BusinessError } from "@/server/business-error";

const mocks = vi.hoisted(() => ({
  codexStartThread: vi.fn(),
  codexRunStreamed: vi.fn(),
  responseParse: vi.fn()
}));

vi.mock("@openai/codex-sdk", () => ({
  Codex: vi.fn(function CodexMock() {
    return {
      startThread: mocks.codexStartThread.mockReturnValue({
        runStreamed: mocks.codexRunStreamed
      })
    };
  })
}));

vi.mock("openai", () => ({
  default: vi.fn(function OpenAiMock() {
    return {
      responses: {
        parse: mocks.responseParse
      }
    };
  })
}));

import { generateRecommendationText } from "@/server/generation-adapter";

const ANSI = {
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  reset: "\x1b[0m"
};

function createEventStream(events: ThreadEvent[]) {
  return (async function* streamEvents() {
    for (const event of events) {
      yield event;
    }
  })();
}

function mockCodexEvents(events: ThreadEvent[]) {
  mocks.codexRunStreamed.mockResolvedValue({
    events: createEventStream(events)
  });
}

describe("recommendation generation adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LOCAL_CODEX_ENABLED", "true");
    vi.stubEnv("VERCEL_ENV", "");
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("parses Local Codex streamed recommendation text and emits progress logs", async () => {
    mockCodexEvents([
      { type: "thread.started", thread_id: "thread-1" },
      { type: "turn.started" },
      {
        type: "item.completed",
        item: {
          id: "message-1",
          type: "agent_message",
          text: JSON.stringify({
            dishes: [
              {
                name: "Tomato rice",
                summary: "A quick rice bowl.",
                instructions: ["Warm rice.", "Top with tomato."],
                estimatedMinutes: 12,
                consumptions: []
              }
            ]
          })
        }
      },
      {
        type: "turn.completed",
        usage: {
          input_tokens: 10,
          cached_input_tokens: 0,
          output_tokens: 20,
          reasoning_output_tokens: 5
        }
      }
    ]);

    const result = await generateRecommendationText({
      mode: "local_codex",
      prompt: "recommend one dish"
    });

    expect(result.dishes).toHaveLength(1);
    expect(result.dishes[0]?.name).toBe("Tomato rice");
    expect(mocks.codexRunStreamed).toHaveBeenCalledWith(
      "recommend one dish",
      expect.objectContaining({
        outputSchema: expect.any(Object)
      })
    );
    const infoLogs = vi.mocked(console.info).mock.calls.map(([line]) => String(line));
    expect(infoLogs).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          ` LOCAL-CODEX recommendation_text start ${ANSI.cyan}START${ANSI.reset} in `
        )
      ])
    );
    expect(infoLogs.some((line) => line.includes(`${ANSI.gray}(runId:`))).toBe(true);
    expect(JSON.stringify(infoLogs)).not.toContain("recommend one dish");
    expect(JSON.stringify(infoLogs)).not.toContain("[local-codex]");
  });

  it("maps Local Codex turn failures to LOCAL_CODEX_UNAVAILABLE", async () => {
    mockCodexEvents([
      {
        type: "turn.failed",
        error: {
          message: "Codex unavailable"
        }
      }
    ]);

    await expect(
      generateRecommendationText({
        mode: "local_codex",
        prompt: "recommend one dish"
      })
    ).rejects.toMatchObject(new BusinessError("LOCAL_CODEX_UNAVAILABLE"));
  });

  it("does not emit Local Codex logs for production OpenAI text generation", async () => {
    mocks.responseParse.mockResolvedValue({
      output_parsed: {
        dishes: []
      }
    });

    await generateRecommendationText({
      mode: "production_openai",
      apiKey: "user-key",
      prompt: "recommend one dish"
    });

    expect(console.info).not.toHaveBeenCalled();
  });
});
