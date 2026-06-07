import { put } from "@vercel/blob";

import type { GeneratedImageKind, GenerationMode } from "@/db/schema";
import { BusinessError } from "@/server/business-error";
import {
  createGeneratedImage,
  markGeneratedImageFailed,
  markGeneratedImageSucceeded
} from "@/server/data";
import { generateImageBytes } from "@/server/generation-adapter";
import {
  getImageDeadlineAt,
  IMAGE_GENERATION_FAILED,
  IMAGE_GENERATION_SUPERSEDED,
  IMAGE_GENERATION_TIMED_OUT,
  IMAGE_GENERATION_TIMEOUT_MS
} from "@/server/image-lifecycle";
import { runAfterResponse } from "@/server/background";

export { IMAGE_GENERATION_TIMEOUT_MS } from "@/server/image-lifecycle";

export type StoredImageOutput = {
  id: string;
  status: "pending" | "succeeded" | "failed";
  publicUrl: string | null;
  deadlineAt: string | null;
};

export async function createPendingStoredImage(input: {
  userId: string;
  kind: GeneratedImageKind;
  mode: GenerationMode;
  attach: (imageId: string) => Promise<void>;
}) {
  const image = await createGeneratedImage(input.userId, input.kind, input.mode);
  await input.attach(image.id);
  return toStoredImageOutput(image);
}

export function scheduleStoredImageCompletion(input: {
  imageId: string;
  userId: string;
  kind: GeneratedImageKind;
  mode: GenerationMode;
  apiKey?: string;
  prompt: string;
  isCurrent: () => Promise<boolean>;
}) {
  runAfterResponse(async () => {
    await completeStoredImage(input);
  });
}

export async function completeStoredImage(input: {
  imageId: string;
  userId: string;
  kind: GeneratedImageKind;
  mode: GenerationMode;
  apiKey?: string;
  prompt: string;
  isCurrent: () => Promise<boolean>;
  timeoutMs?: number;
}) {
  const timeoutMs = input.timeoutMs ?? IMAGE_GENERATION_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (!(await input.isCurrent())) {
      return await failIfPending(input.imageId, IMAGE_GENERATION_SUPERSEDED);
    }

    const bytes = await Promise.race([
      generateImageBytes({
        mode: input.mode,
        apiKey: input.apiKey,
        prompt: input.prompt,
        signal: controller.signal,
        timeoutMs
      }),
      rejectOnAbort(controller.signal)
    ]);

    if (!(await input.isCurrent())) {
      return await failIfPending(input.imageId, IMAGE_GENERATION_SUPERSEDED);
    }

    const blob = await put(`generated/${input.kind}/${input.imageId}.png`, bytes, {
      access: "public",
      addRandomSuffix: false,
      contentType: "image/png"
    });

    if (!(await input.isCurrent())) {
      return await failIfPending(input.imageId, IMAGE_GENERATION_SUPERSEDED);
    }

    return toStoredImageOutput(
      await markGeneratedImageSucceeded(input.imageId, {
        blobPathname: blob.pathname,
        publicUrl: blob.url
      })
    );
  } catch (error) {
    const errorCode = controller.signal.aborted
      ? IMAGE_GENERATION_TIMED_OUT
      : getSafeImageErrorCode(error);

    return await failIfPending(input.imageId, errorCode);
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateStoredImage(input: {
  userId: string;
  kind: GeneratedImageKind;
  mode: GenerationMode;
  apiKey?: string;
  prompt: string;
  attach: (imageId: string) => Promise<void>;
}) {
  const pending = await createPendingStoredImage(input);

  return completeStoredImage({
    imageId: pending.id,
    userId: input.userId,
    kind: input.kind,
    mode: input.mode,
    apiKey: input.apiKey,
    prompt: input.prompt,
    isCurrent: async () => true
  });
}

async function failIfPending(imageId: string, errorCode: string) {
  return toStoredImageOutput(await markGeneratedImageFailed(imageId, errorCode));
}

function toStoredImageOutput(
  image:
    | {
        id: string;
        status: "pending" | "succeeded" | "failed";
        publicUrl: string | null;
        createdAt?: Date | string | null;
      }
    | null
): StoredImageOutput {
  if (!image) {
    return {
      id: "",
      status: "failed",
      publicUrl: null,
      deadlineAt: null
    };
  }

  return {
    id: image.id,
    status: image.status,
    publicUrl: image.publicUrl,
    deadlineAt: getImageDeadlineAt({
      status: image.status,
      createdAt: image.createdAt ?? null
    })
  };
}

function getSafeImageErrorCode(error: unknown) {
  if (error instanceof BusinessError) {
    return error.code;
  }

  if (isTimeoutError(error)) {
    return IMAGE_GENERATION_TIMED_OUT;
  }

  return IMAGE_GENERATION_FAILED;
}

function isTimeoutError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const name = error.name.toLowerCase();
  const message = error.message.toLowerCase();

  return name.includes("timeout") || message.includes("timeout") || message.includes("timed out");
}

function rejectOnAbort(signal: AbortSignal) {
  return new Promise<never>((_resolve, reject) => {
    if (signal.aborted) {
      reject(new Error(IMAGE_GENERATION_TIMED_OUT));
      return;
    }

    signal.addEventListener("abort", () => reject(new Error(IMAGE_GENERATION_TIMED_OUT)), {
      once: true
    });
  });
}
