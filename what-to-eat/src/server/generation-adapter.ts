import { copyFile, mkdir, readFile, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { homedir } from "node:os";

import { Codex } from "@openai/codex-sdk";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import type { GenerationMode } from "@/db/schema";
import {
  recommendationResultJsonSchema,
  recommendationResultSchema,
  type RecommendationResult
} from "@/lib/recommendations";
import { BusinessError } from "@/server/business-error";
import { removeChromaKeyBackground } from "@/server/image-processing";
import {
  createLocalCodexRunId,
  logLocalCodexProgress,
  runLocalCodexTurnWithProgress
} from "@/server/local-codex-progress";
import { MEAL_IMAGE_MODEL, TEXT_RECOMMENDATION_MODEL } from "@/server/openai/models";

const localCodexImageRoot = path.join(process.cwd(), ".tmp", "local-codex-images");
const MAX_LOCAL_CODEX_DETAIL_LENGTH = 240;
const MAX_LOCAL_CODEX_CLI_ERROR_LENGTH = 4_000;
const LOCAL_CODEX_GENERATED_IMAGE_POLL_MS = 250;

export async function validateOpenAiKey(apiKey: string) {
  try {
    await new OpenAI({ apiKey }).models.list();
    return true;
  } catch {
    return false;
  }
}

export async function generateRecommendationText(input: {
  mode: GenerationMode;
  apiKey?: string;
  prompt: string;
}): Promise<RecommendationResult> {
  if (input.mode === "local_codex") {
    return generateRecommendationWithLocalCodex(input.prompt);
  }

  if (!input.apiKey) {
    throw new BusinessError("MISSING_OPENAI_KEY");
  }

  try {
    const response = await new OpenAI({ apiKey: input.apiKey }).responses.parse({
      model: TEXT_RECOMMENDATION_MODEL,
      input: input.prompt,
      text: {
        format: zodTextFormat(recommendationResultSchema, "meal_recommendation")
      }
    });

    if (!response.output_parsed) {
      throw new BusinessError("MODEL_RESPONSE_INVALID");
    }

    return response.output_parsed;
  } catch (error) {
    if (error instanceof BusinessError) {
      throw error;
    }

    throw new BusinessError("UPSTREAM_OPENAI_ERROR");
  }
}

async function generateRecommendationWithLocalCodex(prompt: string) {
  const runId = createLocalCodexRunId();
  const startedAtMs = Date.now();

  try {
    const codex = new Codex();
    const thread = codex.startThread({
      approvalPolicy: "never",
      sandboxMode: "read-only",
      skipGitRepoCheck: true,
      webSearchMode: "disabled",
      workingDirectory: process.cwd()
    });
    const turn = await runLocalCodexTurnWithProgress({
      thread,
      prompt,
      task: "recommendation_text",
      runId,
      startedAtMs,
      turnOptions: {
        outputSchema: recommendationResultJsonSchema
      }
    });
    const parsed = recommendationResultSchema.safeParse(JSON.parse(turn.finalResponse));

    if (!parsed.success) {
      logLocalCodexProgress({
        task: "recommendation_text",
        runId,
        event: "failed",
        level: "warn",
        startedAtMs,
        metadata: {
          reason: "invalid_structured_response"
        }
      });
      throw new BusinessError("MODEL_RESPONSE_INVALID");
    }

    return parsed.data;
  } catch (error) {
    if (error instanceof BusinessError) {
      throw error;
    }

    logLocalCodexProgress({
      task: "recommendation_text",
      runId,
      event: "failed",
      level: "warn",
      startedAtMs,
      metadata: {
        reason: "codex_unavailable"
      }
    });
    throw new BusinessError("LOCAL_CODEX_UNAVAILABLE");
  }
}

export async function generateImageBytes(input: {
  mode: GenerationMode;
  apiKey?: string;
  prompt: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}) {
  if (input.mode === "local_codex") {
    return generateLocalCodexImageBytes(input.prompt, input.signal);
  }

  if (!input.apiKey) {
    throw new BusinessError("MISSING_OPENAI_KEY");
  }

  try {
    const response = await new OpenAI({ apiKey: input.apiKey }).images.generate({
      model: MEAL_IMAGE_MODEL,
      prompt: input.prompt,
      size: "512x512"
    }, {
      maxRetries: 0,
      signal: input.signal,
      timeout: input.timeoutMs
    });
    const base64Image = response.data?.[0]?.b64_json;

    if (!base64Image) {
      throw new BusinessError("UPSTREAM_OPENAI_ERROR");
    }

    return removeChromaKeyBackground(Buffer.from(base64Image, "base64"));
  } catch (error) {
    if (error instanceof BusinessError) {
      throw error;
    }

    throw new BusinessError("UPSTREAM_OPENAI_ERROR");
  }
}

async function generateLocalCodexImageBytes(prompt: string, signal?: AbortSignal) {
  const runId = createLocalCodexRunId();
  const startedAtMs = Date.now();
  const outputDirectory = path.join(localCodexImageRoot, randomUUID());
  const outputPath = path.join(outputDirectory, "output.png");

  try {
    await mkdir(outputDirectory, { recursive: true });
    assertPathInside(localCodexImageRoot, outputPath);
    logLocalCodexProgress({
      task: "image_generation",
      runId,
      event: "output.prepared",
      startedAtMs,
      metadata: {
        outputFile: path.basename(outputPath),
        outputDirectory: path.basename(outputDirectory)
      }
    });

    await runLocalCodexImageCommand({
      outputDirectory,
      outputPath,
      prompt: getLocalCodexImagePrompt({
        outputPath,
        prompt
      }),
      signal
    });

    const outputStat = await stat(outputPath).catch(() => null);

    if (!outputStat?.isFile()) {
      logLocalCodexProgress({
        task: "image_generation",
        runId,
        event: "output.missing",
        level: "warn",
        startedAtMs
      });
      throw new Error("Local Codex did not create an output file.");
    }

    logLocalCodexProgress({
      task: "image_generation",
      runId,
      event: "output.found",
      startedAtMs,
      metadata: {
        byteLength: outputStat.size
      }
    });
    const bytes = await readFile(outputPath);
    const processed = removeChromaKeyBackground(bytes);
    logLocalCodexProgress({
      task: "image_generation",
      runId,
      event: "output.processed",
      startedAtMs,
      metadata: {
        byteLength: processed.byteLength
      }
    });
    return processed;
  } catch (error) {
    if (error instanceof BusinessError) {
      throw error;
    }

    logLocalCodexProgress({
      task: "image_generation",
      runId,
      event: "failed",
      level: "warn",
      startedAtMs,
      metadata: {
        reason: "codex_unavailable",
        detail: getSafeLocalCodexErrorDetail(error)
      }
    });
    throw new BusinessError("LOCAL_CODEX_UNAVAILABLE");
  } finally {
    await rm(outputDirectory, { force: true, recursive: true });
  }
}

function getLocalCodexImagePrompt(input: {
  outputPath: string;
  prompt: string;
}) {
  return [
    "Generate one PNG image for this application request.",
    "Do not edit source files, package files, configuration, docs, or tests.",
    "Use the built-in imagegen/image_gen path if it is available.",
    "After the image is generated, do not search CODEX_HOME or copy generated files yourself.",
    "The host application will copy the generated PNG from the Codex generated_images directory.",
    "Write only the final PNG image to the exact output path below.",
    `Output file: ${input.outputPath}`,
    "",
    "Visual prompt:",
    input.prompt
  ].join("\n");
}

async function runLocalCodexImageCommand(input: {
  outputDirectory: string;
  outputPath: string;
  prompt: string;
  signal?: AbortSignal;
}) {
  if (input.signal?.aborted) {
    throw new Error("Local Codex image generation aborted.");
  }

  const codexCliPath = resolveLocalCodexCliPath();
  const child = spawn(
    process.execPath,
    [
      codexCliPath,
      "exec",
      "--json",
      "--ephemeral",
      "--disable",
      "plugins",
      "--skip-git-repo-check",
      "--sandbox",
      "workspace-write",
      "--config",
      "approval_policy=\"never\"",
      "--config",
      "web_search=\"disabled\"",
      "--config",
      "model_reasoning_effort=\"low\"",
      "--cd",
      input.outputDirectory,
      "-"
    ],
    {
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"]
    }
  );
  let stderr = "";
  let stdout = "";
  let threadId: string | null = null;
  let isCopyingGeneratedImage = false;
  let generatedImagePoll: NodeJS.Timeout | null = null;

  child.stderr?.on("data", (chunk) => {
    const remaining = MAX_LOCAL_CODEX_CLI_ERROR_LENGTH - stderr.length;

    if (remaining > 0) {
      stderr += String(chunk).slice(0, remaining);
    }
  });
  child.stdout?.on("data", (chunk) => {
    stdout += String(chunk);

    let lineBreakIndex = stdout.indexOf("\n");

    while (lineBreakIndex >= 0) {
      const line = stdout.slice(0, lineBreakIndex).trim();
      stdout = stdout.slice(lineBreakIndex + 1);

      if (line) {
        threadId = getLocalCodexThreadIdFromJsonLine(line) ?? threadId;
      }

      lineBreakIndex = stdout.indexOf("\n");
    }
  });

  await new Promise<void>((resolve, reject) => {
    let settled = false;

    const copyGeneratedImageIfReady = async () => {
      if (!threadId || isCopyingGeneratedImage) {
        return false;
      }

      isCopyingGeneratedImage = true;

      try {
        const generatedImagePath = await findLocalCodexGeneratedImage(threadId);

        if (!generatedImagePath) {
          return false;
        }

        await copyFile(generatedImagePath, input.outputPath);
        return true;
      } finally {
        isCopyingGeneratedImage = false;
      }
    };
    const pollGeneratedImage = () => {
      void copyGeneratedImageIfReady()
        .then((copied) => {
          if (!copied) {
            return;
          }

          settle(() => {
            child.kill("SIGTERM");
            resolve();
          });
        })
        .catch((error: unknown) => {
          settle(() => reject(error));
        });
    };
    const settle = (callback: () => void) => {
      if (settled) {
        return;
      }

      settled = true;
      if (generatedImagePoll) {
        clearInterval(generatedImagePoll);
      }
      input.signal?.removeEventListener("abort", abort);
      child.removeListener("error", onError);
      child.removeListener("exit", onExit);
      child.stdin?.removeListener("error", onStdinError);
      callback();
    };
    const abort = () => {
      settle(() => {
        child.kill("SIGTERM");
        reject(new Error("Local Codex image generation aborted."));
      });
    };
    const onError = (error: Error) => {
      settle(() => reject(error));
    };
    const onStdinError = (error: Error) => {
      settle(() => reject(error));
    };
    const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
      void copyGeneratedImageIfReady()
        .then((copied) => {
          if (copied || (code === 0 && !signal)) {
            settle(resolve);
            return;
          }

          const exitDetail = signal ? `signal ${signal}` : `code ${code ?? 1}`;
          const detail = sanitizeLocalCodexCliError(stderr, input.prompt);
          settle(() => reject(new Error(`Local Codex CLI exited with ${exitDetail}: ${detail}`)));
        })
        .catch((error: unknown) => {
          settle(() => reject(error));
        });
    };

    generatedImagePoll = setInterval(pollGeneratedImage, LOCAL_CODEX_GENERATED_IMAGE_POLL_MS);
    input.signal?.addEventListener("abort", abort, { once: true });
    child.once("error", onError);
    child.once("exit", onExit);

    if (!child.stdin) {
      child.kill("SIGTERM");
      settle(() => reject(new Error("Local Codex CLI process did not expose stdin.")));
      return;
    }

    child.stdin.once("error", onStdinError);
    if (input.signal?.aborted) {
      abort();
      return;
    }

    child.stdin.end(input.prompt);
  });
}

export function resolveLocalCodexCliPath(input: {
  cwd?: string;
} = {}) {
  const cwd = input.cwd ?? process.cwd();

  return path.join(cwd, "node_modules", "@openai", "codex", "bin", "codex.js");
}

function assertPathInside(root: string, target: string) {
  const relative = path.relative(path.resolve(root), path.resolve(target));

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Local Codex output path escaped the image directory.");
  }
}

function getSafeLocalCodexErrorDetail(error: unknown) {
  if (error instanceof Error) {
    return sanitizeLocalCodexErrorDetail(error.message);
  }

  return "Local Codex image generation failed.";
}

function sanitizeLocalCodexErrorDetail(value: string) {
  const singleLine = value.replace(/\s+/g, " ").trim();
  return singleLine
    ? singleLine.slice(0, MAX_LOCAL_CODEX_DETAIL_LENGTH)
    : "Local Codex image generation failed.";
}

function sanitizeLocalCodexCliError(value: string, prompt: string) {
  const singleLine = value
    .replaceAll(prompt, "[redacted prompt]")
    .replace(/raw output[^,.;)]*/gi, "[redacted output]")
    .replace(/\s+/g, " ")
    .trim();

  return singleLine || "Local Codex image generation failed.";
}

function getLocalCodexThreadIdFromJsonLine(line: string) {
  const parsed: unknown = JSON.parse(line);

  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "type" in parsed &&
    parsed.type === "thread.started" &&
    "thread_id" in parsed &&
    typeof parsed.thread_id === "string" &&
    isSafeLocalCodexThreadId(parsed.thread_id)
  ) {
    return parsed.thread_id;
  }

  return null;
}

function isSafeLocalCodexThreadId(value: string) {
  return /^[\w-]+$/u.test(value);
}

async function findLocalCodexGeneratedImage(threadId: string) {
  const codexHome = process.env.CODEX_HOME ?? path.join(homedir(), ".codex");
  const threadImageDirectory = path.join(codexHome, "generated_images", threadId);

  return findFirstPng(threadImageDirectory);
}

async function findFirstPng(directory: string): Promise<string | null> {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isFile() && path.extname(entry.name).toLowerCase() === ".png") {
      return fullPath;
    }
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const found = await findFirstPng(path.join(directory, entry.name));

    if (found) {
      return found;
    }
  }

  return null;
}
