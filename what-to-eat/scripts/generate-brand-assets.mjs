import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appDir = path.join(root, "src", "app");
const brandDir = path.join(root, "public", "brand");
const logoBoard = path.join(brandDir, "source-logo-board.png");

const crops = {
  logoZh: { left: 72, top: 96, width: 1328, height: 360 },
  logoEn: { left: 54, top: 560, width: 1048, height: 236 },
  headerLogoZh: { left: 75, top: 887, width: 430, height: 98 },
  headerLogoEn: { left: 548, top: 886, width: 532, height: 106 },
  appIcon: { left: 1183, top: 572, width: 276, height: 276 }
};

const headerLogoCanvas = {
  en: { width: 550, height: 110 },
  zh: { width: 456, height: 112 }
};

async function writeWebpCrop(name, crop, width) {
  await sharp(logoBoard)
    .extract(crop)
    .resize({ width, withoutEnlargement: false })
    .webp({ quality: 92 })
    .toFile(path.join(brandDir, name));
}

function clearEdgeConnectedBackground(data, info, options = {}) {
  const background = options.background ?? [253, 247, 236];
  const tolerance = options.tolerance ?? 70;
  const { channels, height, width } = info;
  const seen = new Uint8Array(width * height);
  const queue = [];

  function isBackgroundLike(pixelIndex) {
    const offset = pixelIndex * channels;
    const distance =
      Math.abs(data[offset] - background[0]) +
      Math.abs(data[offset + 1] - background[1]) +
      Math.abs(data[offset + 2] - background[2]);

    return distance < tolerance;
  }

  function push(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) {
      return;
    }

    const pixelIndex = y * width + x;
    if (seen[pixelIndex] || !isBackgroundLike(pixelIndex)) {
      return;
    }

    seen[pixelIndex] = 1;
    queue.push(pixelIndex);
  }

  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    push(x, height - 1);
  }

  for (let y = 0; y < height; y += 1) {
    push(0, y);
    push(width - 1, y);
  }

  for (let index = 0; index < queue.length; index += 1) {
    const pixelIndex = queue[index];
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);

    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  for (let pixelIndex = 0; pixelIndex < seen.length; pixelIndex += 1) {
    if (seen[pixelIndex]) {
      data[pixelIndex * channels + 3] = 0;
    }
  }
}

function getOpaqueBounds(data, info) {
  const { channels, height, width } = info;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * channels + 3];

      if (alpha > 8) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    throw new Error("Could not find opaque icon artwork after background cleanup.");
  }

  return {
    height: maxY - minY + 1,
    left: minX,
    top: minY,
    width: maxX - minX + 1
  };
}

async function writeTransparentHeaderLogo(name, crop, canvas) {
  const { data, info } = await sharp(logoBoard)
    .extract(crop)
    .resize({ width: canvas.width, withoutEnlargement: false })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  clearEdgeConnectedBackground(data, info);

  const verticalPadding = Math.max(canvas.height - info.height, 0);

  await sharp(data, { raw: info })
    .extend({
      background: { alpha: 0, b: 0, g: 0, r: 0 },
      bottom: Math.ceil(verticalPadding / 2),
      left: 0,
      right: 0,
      top: Math.floor(verticalPadding / 2)
    })
    .webp({ quality: 92 })
    .toFile(path.join(brandDir, name));
}

async function createTransparentIconPng(size) {
  const { data, info } = await sharp(logoBoard)
    .extract(crops.appIcon)
    .resize(size, size, { fit: "cover" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  clearEdgeConnectedBackground(data, info);

  const bounds = getOpaqueBounds(data, info);
  const artwork = await sharp(data, { raw: info })
    .extract(bounds)
    .png({ compressionLevel: 9 })
    .toBuffer();

  return sharp({
    create: {
      background: { alpha: 0, b: 0, g: 0, r: 0 },
      channels: 4,
      height: size,
      width: size
    }
  })
    .composite([
      {
        input: artwork,
        left: Math.floor((size - bounds.width) / 2),
        top: Math.floor((size - bounds.height) / 2)
      }
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function writePngIcon(filePath, size) {
  await writeFile(filePath, await createTransparentIconPng(size));
}

function makeIconDirectoryEntry({ size, offset, byteLength }) {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size === 256 ? 0 : size, 0);
  entry.writeUInt8(size === 256 ? 0 : size, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(byteLength, 8);
  entry.writeUInt32LE(offset, 12);
  return entry;
}

async function createFaviconBuffer() {
  const iconSizes = [16, 32, 48, 64, 128, 256];
  const pngs = await Promise.all(iconSizes.map((size) => createTransparentIconPng(size)));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(iconSizes.length, 4);

  let offset = header.byteLength + iconSizes.length * 16;
  const entries = pngs.map((png, index) => {
    const entry = makeIconDirectoryEntry({
      size: iconSizes[index],
      offset,
      byteLength: png.byteLength
    });
    offset += png.byteLength;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...pngs]);
}

async function writeFaviconFiles() {
  const favicon = await createFaviconBuffer();

  await writeFile(path.join(root, "public", "favicon.ico"), favicon);
  await writeFile(path.join(appDir, "favicon.ico"), favicon);
}

async function main() {
  await mkdir(brandDir, { recursive: true });
  await mkdir(appDir, { recursive: true });
  await readFile(logoBoard);

  await writeWebpCrop("logo-zh.webp", crops.logoZh, 1328);
  await writeWebpCrop("logo-en.webp", crops.logoEn, 1048);
  await writeTransparentHeaderLogo("header-logo-zh.webp", crops.headerLogoZh, headerLogoCanvas.zh);
  await writeTransparentHeaderLogo("header-logo-en.webp", crops.headerLogoEn, headerLogoCanvas.en);
  await writePngIcon(path.join(brandDir, "app-icon-1024.png"), 1024);
  await writePngIcon(path.join(brandDir, "app-icon-512.png"), 512);
  await writePngIcon(path.join(brandDir, "app-icon-192.png"), 192);
  await writePngIcon(path.join(appDir, "icon.png"), 512);
  await writePngIcon(path.join(appDir, "apple-icon.png"), 512);
  await writeFaviconFiles();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
