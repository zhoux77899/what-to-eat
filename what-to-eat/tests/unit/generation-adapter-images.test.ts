import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BusinessError } from "@/server/business-error";
import { decodeRgbaPng, encodeRgbaPng } from "@/server/image-processing";

const mocks = vi.hoisted(() => ({
  codexStartThread: vi.fn(),
  codexRun: vi.fn(),
  codexRunStreamed: vi.fn(),
  imageGenerate: vi.fn()
}));

vi.mock("@openai/codex-sdk", () => ({
  Codex: vi.fn(function CodexMock() {
    return {
      startThread: mocks.codexStartThread.mockReturnValue({
        run: mocks.codexRun,
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

function createEventStream(finalResponse = "created") {
  return (async function* streamEvents() {
    yield {
      type: "item.completed" as const,
      item: {
        id: "message-1",
        type: "agent_message" as const,
        text: finalResponse
      }
    };
    yield {
      type: "turn.completed" as const,
      usage: {
        input_tokens: 1,
        cached_input_tokens: 0,
        output_tokens: 1,
        reasoning_output_tokens: 0
      }
    };
  })();
}

function mockLocalCodexImageOutput() {
  mocks.codexRunStreamed.mockImplementation(async (prompt: string) => {
    const outputPath = prompt.match(/Output file: (.+output\.png)/)?.[1];

    if (!outputPath) {
      throw new Error("missing output path");
    }

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, await createSampleChromaPng());

    return {
      events: createEventStream()
    };
  });
}

describe("image generation adapter", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
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
    });
  });

  it("reads the local Codex output file and removes the chroma-key background", async () => {
    mockLocalCodexImageOutput();

    const bytes = await generateImageBytes({
      mode: "local_codex",
      prompt: "comic prompt"
    });
    const decoded = decodeRgbaPng(bytes);

    expect(decoded.width).toBe(512);
    expect(decoded.height).toBe(512);
    expect(decoded.data[3]).toBe(0);
    expect(mocks.codexStartThread).toHaveBeenCalledWith(
      expect.objectContaining({
        approvalPolicy: "never",
        sandboxMode: "workspace-write",
        workingDirectory: expect.stringContaining(`${path.sep}.tmp${path.sep}local-codex-images${path.sep}`)
      })
    );
    expect(mocks.codexRunStreamed).toHaveBeenCalledWith(
      expect.stringContaining("comic prompt"),
      undefined
    );
    expect(mocks.codexRunStreamed).toHaveBeenCalledWith(
      expect.stringContaining("Output file:"),
      undefined
    );
    const infoLogs = vi.mocked(console.info).mock.calls.map(([line]) => String(line));
    expect(infoLogs).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          `LOCAL-CODEX image_generation output.prepared ${ANSI.blue}RUNNING${ANSI.reset} in `
        ),
        expect.stringContaining(
          `LOCAL-CODEX image_generation output.processed ${ANSI.green}DONE${ANSI.reset} in `
        )
      ])
    );
    expect(infoLogs.some((line) => line.includes(`${ANSI.gray}(runId:`))).toBe(true);
    expect(JSON.stringify(infoLogs)).not.toContain("[local-codex]");
  });

  it("fails safely when local Codex does not create an output image", async () => {
    mocks.codexRunStreamed.mockResolvedValue({
      events: createEventStream("no image")
    });

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
          `LOCAL-CODEX image_generation output.missing ${ANSI.yellow}WARN${ANSI.reset} in `
        )
      ])
    );
    expect(warnLogs.some((line) => line.includes(`${ANSI.gray}(runId:`))).toBe(true);
    expect(JSON.stringify(warnLogs)).not.toContain("[local-codex]");
  });
});
