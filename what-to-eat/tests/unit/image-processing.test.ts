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
});
