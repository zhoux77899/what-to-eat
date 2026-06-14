import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function readAsset(path: string) {
  return readFileSync(join(projectRoot, "public", path));
}

function expectWebpAsset(path: string) {
  const asset = readAsset(path);

  expect(asset.byteLength, path).toBeGreaterThan(4096);
  expect(asset.subarray(0, 4).toString("ascii"), path).toBe("RIFF");
  expect(asset.subarray(8, 12).toString("ascii"), path).toBe("WEBP");
}

function expectPngDimensions(path: string, width: number, height: number) {
  const asset = readAsset(path);

  expect(asset.subarray(1, 4).toString("ascii"), path).toBe("PNG");
  expect(asset.readUInt32BE(16), path).toBe(width);
  expect(asset.readUInt32BE(20), path).toBe(height);
}

describe("brand static assets", () => {
  it("ships cropped logo and header logo assets from the approved design board", () => {
    expectWebpAsset("brand/logo-zh.webp");
    expectWebpAsset("brand/logo-en.webp");
    expectWebpAsset("brand/header-logo-zh.webp");
    expectWebpAsset("brand/header-logo-en.webp");
  });

  it("ships app icons and favicon derived from the approved design board", () => {
    expectPngDimensions("brand/app-icon-1024.png", 1024, 1024);
    expectPngDimensions("brand/app-icon-512.png", 512, 512);
    expectPngDimensions("brand/app-icon-192.png", 192, 192);

    const favicon = readAsset("favicon.ico");
    expect(favicon.byteLength).toBeGreaterThan(1024);
    expect(favicon[0]).toBe(0);
    expect(favicon[1]).toBe(0);
    expect(favicon[2]).toBe(1);
    expect(favicon[3]).toBe(0);
  });

  it("keeps the approved source design boards available for repeatable asset generation", () => {
    expect(existsSync(join(projectRoot, "public", "brand", "source-logo-board.png"))).toBe(true);
    expect(existsSync(join(projectRoot, "public", "brand", "source-ui-board.png"))).toBe(true);
  });
});
