import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createGeneratedImage: vi.fn(),
  generateImageBytes: vi.fn(),
  markGeneratedImageFailed: vi.fn(),
  markGeneratedImageSucceeded: vi.fn(),
  put: vi.fn()
}));

vi.mock("@vercel/blob", () => ({
  put: mocks.put
}));

vi.mock("@/server/data", () => ({
  createGeneratedImage: mocks.createGeneratedImage,
  markGeneratedImageFailed: mocks.markGeneratedImageFailed,
  markGeneratedImageSucceeded: mocks.markGeneratedImageSucceeded
}));

vi.mock("@/server/generation-adapter", () => ({
  generateImageBytes: mocks.generateImageBytes
}));

import {
  completeStoredImage,
  createPendingStoredImage,
  IMAGE_GENERATION_TIMEOUT_MS
} from "@/server/images";

describe("stored image task lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();

    mocks.createGeneratedImage.mockResolvedValue({
      id: "image-1",
      status: "pending",
      publicUrl: null,
      createdAt: new Date("2026-06-06T00:00:00.000Z")
    });
    mocks.markGeneratedImageSucceeded.mockResolvedValue({
      id: "image-1",
      status: "succeeded",
      publicUrl: "https://blob.test/image.png"
    });
    mocks.markGeneratedImageFailed.mockResolvedValue({
      id: "image-1",
      status: "failed",
      errorCode: "IMAGE_GENERATION_TIMED_OUT"
    });
    mocks.put.mockResolvedValue({
      pathname: "generated/dish/image-1.png",
      url: "https://blob.test/image.png"
    });
  });

  it("creates a pending image with a server deadline before attaching it", async () => {
    const attached: string[] = [];

    const image = await createPendingStoredImage({
      userId: "user-1",
      kind: "dish",
      mode: "production_openai",
      attach: async (imageId) => {
        attached.push(imageId);
      }
    });

    expect(attached).toEqual(["image-1"]);
    expect(image).toMatchObject({
      id: "image-1",
      status: "pending",
      publicUrl: null,
      deadlineAt: "2026-06-06T00:02:00.000Z"
    });
  });

  it("aborts image generation at the server deadline and records a timeout failure", async () => {
    vi.useFakeTimers();
    mocks.generateImageBytes.mockImplementation(
      ({ signal }: { signal?: AbortSignal }) =>
        new Promise<Buffer>((_resolve, reject) => {
          signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
        })
    );

    const task = completeStoredImage({
      imageId: "image-1",
      userId: "user-1",
      kind: "dish",
      mode: "production_openai",
      apiKey: "user-openai-key",
      prompt: "dish prompt",
      isCurrent: async () => true
    });

    await vi.advanceTimersByTimeAsync(IMAGE_GENERATION_TIMEOUT_MS);
    await task;

    expect(mocks.generateImageBytes).toHaveBeenCalledWith(
      expect.objectContaining({
        signal: expect.any(AbortSignal),
        timeoutMs: IMAGE_GENERATION_TIMEOUT_MS
      })
    );
    expect(mocks.markGeneratedImageFailed).toHaveBeenCalledWith(
      "image-1",
      "IMAGE_GENERATION_TIMED_OUT"
    );
    vi.useRealTimers();
  });

  it("does not let a stale task overwrite a newer image record", async () => {
    let currentChecks = 0;

    mocks.generateImageBytes.mockResolvedValue(Buffer.from("image-bytes"));

    await completeStoredImage({
      imageId: "image-1",
      userId: "user-1",
      kind: "dish",
      mode: "production_openai",
      apiKey: "user-openai-key",
      prompt: "dish prompt",
      isCurrent: async () => {
        currentChecks += 1;
        return currentChecks === 1;
      }
    });

    expect(mocks.put).not.toHaveBeenCalled();
    expect(mocks.markGeneratedImageSucceeded).not.toHaveBeenCalled();
    expect(mocks.markGeneratedImageFailed).toHaveBeenCalledWith(
      "image-1",
      "IMAGE_GENERATION_SUPERSEDED"
    );
  });

  it("records SDK timeout errors with the shared timeout error code", async () => {
    const timeoutError = Object.assign(new Error("Request timed out."), {
      name: "APIConnectionTimeoutError"
    });

    mocks.generateImageBytes.mockRejectedValue(timeoutError);

    await completeStoredImage({
      imageId: "image-1",
      userId: "user-1",
      kind: "dish",
      mode: "production_openai",
      apiKey: "user-openai-key",
      prompt: "dish prompt",
      isCurrent: async () => true
    });

    expect(mocks.markGeneratedImageFailed).toHaveBeenCalledWith(
      "image-1",
      "IMAGE_GENERATION_TIMED_OUT"
    );
  });
});
