import { mkdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

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
const require = createRequire(import.meta.url);

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
      prompt,
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
        reason: "codex_unavailable"
      }
    });
    throw new BusinessError("LOCAL_CODEX_UNAVAILABLE");
  } finally {
    await rm(outputDirectory, { force: true, recursive: true });
  }
}

async function runLocalCodexImageCommand(input: {
  outputDirectory: string;
  outputPath: string;
  prompt: string;
  signal?: AbortSignal;
}) {
  const codexCliPath = path.join(
    path.dirname(require.resolve("@openai/codex/package.json")),
    "bin",
    "codex.js"
  );
  const child = spawn(
    process.execPath,
    [
      codexCliPath,
      "exec",
      "--json",
      "--ephemeral",
      "--skip-git-repo-check",
      "--sandbox",
      "workspace-write",
      "--ask-for-approval",
      "never",
      "--cd",
      input.outputDirectory,
      "-"
    ],
    {
      env: process.env,
      signal: input.signal,
      stdio: ["pipe", "pipe", "pipe"]
    }
  );
  let stderr = "";

  child.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });
  child.stdout.resume();
  child.stdin.end(
    [
      "Generate one PNG image for this application request.",
      "Do not edit source files, package files, configuration, docs, or tests.",
      "Write only the final PNG image to the exact output path below.",
      `Output file: ${input.outputPath}`,
      "",
      "Visual prompt:",
      input.prompt
    ].join("\n")
  );

  await new Promise<void>((resolve, reject) => {
    const abort = () => {
      child.kill("SIGTERM");
      reject(new Error("Local Codex image generation aborted."));
    };

    input.signal?.addEventListener("abort", abort, { once: true });
    child.on("error", (error) => {
      input.signal?.removeEventListener("abort", abort);
      reject(error);
    });
    child.on("exit", (code) => {
      input.signal?.removeEventListener("abort", abort);

      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(sanitizeCliError(stderr)));
    });
  });
}

function assertPathInside(root: string, target: string) {
  const relative = path.relative(path.resolve(root), path.resolve(target));

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Local Codex output path escaped the image directory.");
  }
}

function sanitizeCliError(value: string) {
  const singleLine = value.replace(/\s+/g, " ").trim();
  return singleLine ? singleLine.slice(0, 240) : "Local Codex image generation failed.";
}
