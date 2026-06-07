import { mkdir, rm, writeFile } from "node:fs/promises";
import { EventEmitter } from "node:events";
import path from "node:path";
import { PassThrough } from "node:stream";

import type { ThreadEvent } from "@openai/codex-sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BusinessError } from "@/server/business-error";
import { decodeRgbaPng, encodeRgbaPng } from "@/server/image-processing";

const mocks = vi.hoisted(() => ({
  codexStartThread: vi.fn(),
  codexRunStreamed: vi.fn(),
  imageGenerate: vi.fn(),
  spawn: vi.fn()
}));

vi.mock("node:child_process", () => ({
  default: {
    spawn: mocks.spawn
  },
  spawn: mocks.spawn
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
      images: {
        generate: mocks.imageGenerate
      }
    };
  })
}));

import { generateImageBytes } from "@/server/generation-adapter";

const localImageRoot = path.join(process.cwd(), ".tmp", "local-codex-images");
const ANSI = {
  blue: "\x1b[34m",
  gray: "\x1b[90m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  reset: "\x1b[0m",
  yellow: "\x1b[33m"
};

async function createSampleChromaPng() {
  return encodeRgbaPng({
    width: 2,
    height: 2,
    data: new Uint8Array([
      255, 0, 255, 255,
      255, 0, 255, 255,
      255, 0, 255, 255,
      120, 60, 30, 255
    ])
  });
}

function createMockChildProcess() {
  const child = new EventEmitter() as EventEmitter & {
    killed: boolean;
    kill: ReturnType<typeof vi.fn>;
    stderr: PassThrough;
    stdin: PassThrough;
    stdout: PassThrough;
  };

  child.killed = false;
  child.stdin = new PassThrough();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.kill = vi.fn(() => {
    child.killed = true;
    child.emit("exit", null, "SIGTERM");
    return true;
  });
  return child;
}

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

function mockCodexImageOutput() {
  mocks.codexRunStreamed.mockImplementation(async (prompt: string) => {
    const outputPath = prompt.match(/Output file: (.+output\.png)/)?.[1];

    if (!outputPath) {
      throw new Error("Missing mocked output path.");
    }

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, await createSampleChromaPng());

    return {
      events: createEventStream([
        { type: "thread.started", thread_id: "thread-1" },
        { type: "turn.started" },
        {
          type: "turn.completed",
          usage: {
            input_tokens: 10,
            cached_input_tokens: 0,
            output_tokens: 20,
            reasoning_output_tokens: 5
          }
        }
      ])
    };
  });
}

describe("image generation adapter", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.spawn.mockReset();
    mocks.spawn.mockImplementation(() => {
      const child = createMockChildProcess();

      setTimeout(() => {
        child.stderr.end("spawn should not be used for Local Codex image generation");
        child.emit("exit", 1, null);
      }, 0);
      return child;
    });
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LOCAL_CODEX_ENABLED", "true");
    vi.stubEnv("VERCEL_ENV", "");
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await rm(localImageRoot, { force: true, recursive: true });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("uses fixed OpenAI image settings for production image generation", async () => {
    mocks.imageGenerate.mockResolvedValue({
      data: [{ b64_json: (await createSampleChromaPng()).toString("base64") }]
    });

    const bytes = await generateImageBytes({
      mode: "production_openai",
      apiKey: "user-key",
      prompt: "comic prompt"
    });
    const decoded = decodeRgbaPng(bytes);

    expect(decoded.width).toBe(512);
    expect(decoded.height).toBe(512);
    expect(decoded.data[3]).toBe(0);
    expect(mocks.imageGenerate).toHaveBeenCalledWith({
      model: "gpt-image-2",
      prompt: "comic prompt",
      size: "512x512"
    }, {
      maxRetries: 0,
      signal: undefined,
      timeout: undefined
    });
  });

  it("passes an abort signal and timeout to production image generation", async () => {
    const controller = new AbortController();
    mocks.imageGenerate.mockResolvedValue({
      data: [{ b64_json: (await createSampleChromaPng()).toString("base64") }]
    });

    await generateImageBytes({
      mode: "production_openai",
      apiKey: "user-key",
      prompt: "comic prompt",
      signal: controller.signal,
      timeoutMs: 1234
    });

    expect(mocks.imageGenerate).toHaveBeenCalledWith(
      {
        model: "gpt-image-2",
        prompt: "comic prompt",
        size: "512x512"
      },
      {
        maxRetries: 0,
        signal: controller.signal,
        timeout: 1234
      }
    );
  });

  it("runs local Codex image generation through an abortable SDK thread", async () => {
    const controller = new AbortController();

    mockCodexImageOutput();

    const bytes = await generateImageBytes({
      mode: "local_codex",
      prompt: "comic prompt",
      signal: controller.signal,
      timeoutMs: 5000
    });

    const decoded = decodeRgbaPng(bytes);

    expect(decoded.width).toBe(512);
    expect(decoded.height).toBe(512);
    expect(mocks.codexStartThread).toHaveBeenCalledWith(
      expect.objectContaining({
        approvalPolicy: "never",
        sandboxMode: "workspace-write",
        skipGitRepoCheck: true,
        webSearchMode: "disabled",
        workingDirectory: expect.stringContaining(`${path.sep}.tmp${path.sep}local-codex-images${path.sep}`)
      })
    );
    expect(mocks.codexRunStreamed).toHaveBeenCalledWith(
      expect.stringContaining("Generate one PNG image for this application request."),
      expect.objectContaining({
        signal: controller.signal
      })
    );
    expect(String(mocks.codexRunStreamed.mock.calls[0]?.[0])).toContain("Output file:");
    expect(mocks.spawn).not.toHaveBeenCalled();
  });

  it("reads the local Codex output file and removes the chroma-key background", async () => {
    mockCodexImageOutput();

    const bytes = await generateImageBytes({
      mode: "local_codex",
      prompt: "comic prompt"
    });
    const decoded = decodeRgbaPng(bytes);

    expect(decoded.width).toBe(512);
    expect(decoded.height).toBe(512);
    expect(decoded.data[3]).toBe(0);
    expect(mocks.spawn).not.toHaveBeenCalled();
    expect(mocks.codexStartThread).toHaveBeenCalled();
    expect(mocks.codexRunStreamed).toHaveBeenCalled();
    const infoLogs = vi.mocked(console.info).mock.calls.map(([line]) => String(line));
    expect(infoLogs).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          ` LOCAL-CODEX image_generation output.prepared ${ANSI.blue}RUNNING${ANSI.reset} in `
        ),
        expect.stringContaining(
          ` LOCAL-CODEX image_generation output.processed ${ANSI.green}DONE${ANSI.reset} in `
        )
      ])
    );
    expect(infoLogs.some((line) => line.includes(`${ANSI.gray}(runId:`))).toBe(true);
    expect(JSON.stringify(infoLogs)).not.toContain("[local-codex]");
  });

  it("fails safely when local Codex does not create an output image", async () => {
    mockCodexEvents([
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

    await expect(
      generateImageBytes({
        mode: "local_codex",
        prompt: "comic prompt"
      })
    ).rejects.toMatchObject(new BusinessError("LOCAL_CODEX_UNAVAILABLE"));
    const warnLogs = vi.mocked(console.warn).mock.calls.map(([line]) => String(line));
    expect(warnLogs).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          ` LOCAL-CODEX image_generation output.missing ${ANSI.yellow}WARN${ANSI.reset} in `
        )
      ])
    );
    expect(warnLogs.some((line) => line.includes(`${ANSI.gray}(runId:`))).toBe(true);
    expect(JSON.stringify(warnLogs)).not.toContain("[local-codex]");
  });

  it("logs a safe SDK failure detail when local Codex image generation fails", async () => {
    mockCodexEvents([
      {
        type: "turn.failed",
        error: {
          message: "Codex unavailable for image generation"
        }
      }
    ]);

    await expect(
      generateImageBytes({
        mode: "local_codex",
        prompt: "comic prompt"
      })
    ).rejects.toMatchObject(new BusinessError("LOCAL_CODEX_UNAVAILABLE"));
    const warnLogs = vi.mocked(console.warn).mock.calls.map(([line]) => String(line));

    expect(warnLogs).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          ` LOCAL-CODEX image_generation failed ${ANSI.red}FAILED${ANSI.reset} in `
        )
      ])
    );
    expect(warnLogs.some((line) => line.includes("reason: codex_unavailable"))).toBe(true);
    expect(warnLogs.some((line) => line.includes("detail: Codex unavailable for image generation"))).toBe(true);
    expect(JSON.stringify(warnLogs)).not.toContain("comic prompt");
  });
});
