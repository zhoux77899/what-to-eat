import { describe, expect, it } from "vitest";

import {
  decodeRgbaPng,
  encodeRgbaPng,
  removeChromaKeyBackground
} from "@/server/image-processing";

describe("image processing", () => {
  it("turns the chroma-key background transparent while preserving subject pixels", async () => {
    const rgba = new Uint8Array([
      255, 0, 255, 255,
      255, 0, 255, 255,
      255, 0, 255, 255,
      120, 60, 30, 255
    ]);
    const input = encodeRgbaPng({ width: 2, height: 2, data: rgba });

    const output = await removeChromaKeyBackground(input);
    const decoded = decodeRgbaPng(output);

    expect(decoded.width).toBe(512);
    expect(decoded.height).toBe(512);
    expect(decoded.data[3]).toBe(0);

    const bottomRightAlpha = decoded.data[(511 * 512 + 511) * 4 + 3];
    expect(bottomRightAlpha).toBe(255);
  });

  it("removes edge-connected near-magenta background pixels while preserving enclosed subject pixels", async () => {
    const background = [250, 0, 247, 255];
    const outline = [120, 60, 30, 255];
    const subjectAccent = [245, 8, 238, 255];
    const rgba = new Uint8Array([
      ...background, ...background, ...background, ...background, ...background,
      ...background, ...outline, ...outline, ...outline, ...background,
      ...background, ...outline, ...subjectAccent, ...outline, ...background,
      ...background, ...outline, ...outline, ...outline, ...background,
      ...background, ...background, ...background, ...background, ...background
    ]);
    const input = encodeRgbaPng({ width: 5, height: 5, data: rgba });

    const output = await removeChromaKeyBackground(input);
    const decoded = decodeRgbaPng(output);

    expect(getAlpha(decoded, 0, 0)).toBe(0);
    expect(getAlpha(decoded, 511, 511)).toBe(0);
    expect(getAlpha(decoded, 256, 256)).toBe(255);
    expect(getAlpha(decoded, 205, 205)).toBe(255);
  });

  it("removes exact chroma-key pixels even when they are enclosed", async () => {
    const outline = [120, 60, 30, 255];
    const exactChromaKey = [255, 0, 255, 255];
    const rgba = new Uint8Array([
      ...outline, ...outline, ...outline,
      ...outline, ...exactChromaKey, ...outline,
      ...outline, ...outline, ...outline
    ]);
    const input = encodeRgbaPng({ width: 3, height: 3, data: rgba });

    const output = await removeChromaKeyBackground(input);
    const decoded = decodeRgbaPng(output);

    expect(getAlpha(decoded, 256, 256)).toBe(0);
    expect(getAlpha(decoded, 0, 0)).toBe(255);
  });
});

function getAlpha(image: { width: number; data: Uint8Array }, x: number, y: number) {
  return image.data[(y * image.width + x) * 4 + 3];
}
