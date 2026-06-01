import { put } from "@vercel/blob";

import type { GeneratedImageKind, GenerationMode } from "@/db/schema";
import { BusinessError } from "@/server/business-error";
import {
  createGeneratedImage,
  markGeneratedImageFailed,
  markGeneratedImageSucceeded
} from "@/server/data";
import { generateImageBytes } from "@/server/generation-adapter";

export async function generateStoredImage(input: {
  userId: string;
  kind: GeneratedImageKind;
  mode: GenerationMode;
  apiKey?: string;
  prompt: string;
  attach: (imageId: string) => Promise<void>;
}) {
  const image = await createGeneratedImage(input.userId, input.kind, input.mode);
  await input.attach(image.id);

  try {
    const bytes = await generateImageBytes(input);
    const blob = await put(`generated/${input.kind}/${image.id}.png`, bytes, {
      access: "public",
      addRandomSuffix: false,
      contentType: "image/png"
    });

    return await markGeneratedImageSucceeded(image.id, {
      blobPathname: blob.pathname,
      publicUrl: blob.url
    });
  } catch (error) {
    const errorCode = error instanceof BusinessError ? error.code : "IMAGE_GENERATION_FAILED";
    return await markGeneratedImageFailed(image.id, errorCode);
  }
}
