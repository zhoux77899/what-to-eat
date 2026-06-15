import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function readAsset(path: string) {
  return readFileSync(join(projectRoot, "public", path));
}

function readProjectFile(path: string) {
  return readFileSync(join(projectRoot, path));
}

function expectWebpAsset(path: string) {
  const asset = readAsset(path);

  expect(asset.byteLength, path).toBeGreaterThan(4096);
  expect(asset.subarray(0, 4).toString("ascii"), path).toBe("RIFF");
  expect(asset.subarray(8, 12).toString("ascii"), path).toBe("WEBP");
}

function expectPngDimensions(path: string, width: number, height: number) {
  const asset = path.startsWith("public/") || path.startsWith("src/")
    ? readProjectFile(path)
    : readAsset(path);

  expect(asset.subarray(1, 4).toString("ascii"), path).toBe("PNG");
  expect(asset.readUInt32BE(16), path).toBe(width);
  expect(asset.readUInt32BE(20), path).toBe(height);
}

function extractIcoPng(asset: Buffer, targetSize: number) {
  const count = asset.readUInt16LE(4);

  for (let index = 0; index < count; index += 1) {
    const entryOffset = 6 + index * 16;
    const width = asset.readUInt8(entryOffset) || 256;
    const height = asset.readUInt8(entryOffset + 1) || 256;

    if (width === targetSize && height === targetSize) {
      const byteLength = asset.readUInt32LE(entryOffset + 8);
      const imageOffset = asset.readUInt32LE(entryOffset + 12);

      return asset.subarray(imageOffset, imageOffset + byteLength);
    }
  }

  throw new Error(`Missing ${targetSize}x${targetSize} ICO entry`);
}

async function expectTransparentIconCanvas(image: Buffer | string) {
  const { data, info } = await sharp(image)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const points = [
    [0, 0],
    [Math.floor(info.width / 2), 0],
    [info.width - 1, 0],
    [0, Math.floor(info.height / 2)],
    [info.width - 1, Math.floor(info.height / 2)],
    [0, info.height - 1],
    [Math.floor(info.width / 2), info.height - 1],
    [info.width - 1, info.height - 1]
  ];

  for (const [x, y] of points) {
    const offset = (y * info.width + x) * info.channels;
    const alpha = data[offset + 3];

    expect(alpha, `corner ${x},${y}`).toBeLessThan(8);
  }
}

async function expectOpaqueArtworkCentered(image: Buffer | string, maximumOffset: number) {
  const { data, info } = await sharp(image)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + 3];

      if (alpha > 8) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const canvasCenterX = (info.width - 1) / 2;
  const canvasCenterY = (info.height - 1) / 2;

  expect(Math.abs(centerX - canvasCenterX), "horizontal icon artwork offset").toBeLessThanOrEqual(
    maximumOffset
  );
  expect(Math.abs(centerY - canvasCenterY), "vertical icon artwork offset").toBeLessThanOrEqual(
    maximumOffset
  );
}

async function expectTransparentEdges(path: string) {
  const { data, info } = await sharp(join(projectRoot, "public", path))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const edgePoints = [
    [0, 0],
    [Math.floor(info.width / 2), 0],
    [info.width - 1, 0],
    [0, Math.floor(info.height / 2)],
    [info.width - 1, Math.floor(info.height / 2)],
    [0, info.height - 1],
    [Math.floor(info.width / 2), info.height - 1],
    [info.width - 1, info.height - 1]
  ];

  expect(info.channels, path).toBe(4);

  for (const [x, y] of edgePoints) {
    const alpha = data[(y * info.width + x) * info.channels + 3];

    expect(alpha, `${path} edge ${x},${y}`).toBeLessThan(8);
  }
}

async function expectArtworkUsesLowerCanvas(path: string, maximumBottomMargin: number) {
  const { data, info } = await sharp(join(projectRoot, "public", path))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let maxY = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + 3];

      if (alpha > 8) {
        maxY = Math.max(maxY, y);
      }
    }
  }

  expect(info.height - 1 - maxY, `${path} bottom artwork margin`).toBeLessThanOrEqual(
    maximumBottomMargin
  );
}

async function expectClearRightGuard(path: string, minimumTransparentPixels: number) {
  const { data, info } = await sharp(join(projectRoot, "public", path))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let maxX = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + 3];

      if (alpha > 8) {
        maxX = Math.max(maxX, x);
      }
    }
  }

  expect(info.width - 1 - maxX, `${path} right artwork margin`).toBeGreaterThanOrEqual(
    minimumTransparentPixels
  );
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
    expectPngDimensions("src/app/icon.png", 512, 512);
    expectPngDimensions("src/app/apple-icon.png", 512, 512);

    const favicon = readAsset("favicon.ico");
    const appFavicon = readProjectFile("src/app/favicon.ico");

    expect(favicon.byteLength).toBeGreaterThan(1024);
    expect(favicon[0]).toBe(0);
    expect(favicon[1]).toBe(0);
    expect(favicon[2]).toBe(1);
    expect(favicon[3]).toBe(0);
    expect(appFavicon.equals(favicon)).toBe(true);
  });

  it("keeps app icons and favicon on transparent centered canvases", async () => {
    const appIcons = [
      join(projectRoot, "public", "brand", "app-icon-1024.png"),
      join(projectRoot, "public", "brand", "app-icon-512.png"),
      join(projectRoot, "public", "brand", "app-icon-192.png"),
      join(projectRoot, "src", "app", "icon.png"),
      join(projectRoot, "src", "app", "apple-icon.png")
    ];
    const faviconIcon = extractIcoPng(readAsset("favicon.ico"), 256);

    for (const appIcon of appIcons) {
      await expectTransparentIconCanvas(appIcon);
      await expectOpaqueArtworkCentered(appIcon, 4);
    }

    await expectTransparentIconCanvas(faviconIcon);
    await expectOpaqueArtworkCentered(faviconIcon, 3);
  });

  it("applies favicon and app icons through app metadata", () => {
    const layoutSource = readProjectFile("src/app/[locale]/layout.tsx").toString("utf8");

    expect(layoutSource).toContain('type: "image/x-icon"');
    expect(layoutSource).toContain('url: "/favicon.ico"');
    expect(layoutSource).toContain('url: "/icon.png"');
    expect(layoutSource).toContain('url: "/apple-icon.png"');
  });

  it("keeps header logos on transparent canvases without preview-card background", async () => {
    await expectTransparentEdges("brand/header-logo-zh.webp");
    await expectTransparentEdges("brand/header-logo-en.webp");
  });

  it("keeps the full lower artwork in header logos", async () => {
    await expectArtworkUsesLowerCanvas("brand/header-logo-zh.webp", 8);
    await expectArtworkUsesLowerCanvas("brand/header-logo-en.webp", 14);
  });

  it("keeps the English header logo clear of the preview-card right border", async () => {
    await expectClearRightGuard("brand/header-logo-en.webp", 12);
  });

  it("keeps the approved source design boards available for repeatable asset generation", () => {
    expect(existsSync(join(projectRoot, "public", "brand", "source-logo-board.png"))).toBe(true);
    expect(existsSync(join(projectRoot, "public", "brand", "source-ui-board.png"))).toBe(true);
  });
});
