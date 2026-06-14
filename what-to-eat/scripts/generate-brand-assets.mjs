import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const brandDir = path.join(root, "public", "brand");
const logoBoard = path.join(brandDir, "source-logo-board.png");

const crops = {
  logoZh: { left: 72, top: 96, width: 1328, height: 360 },
  logoEn: { left: 54, top: 560, width: 1048, height: 236 },
  headerLogoZh: { left: 58, top: 874, width: 456, height: 112 },
  headerLogoEn: { left: 535, top: 876, width: 550, height: 110 },
  appIcon: { left: 1168, top: 558, width: 294, height: 294 }
};

async function writeWebpCrop(name, crop, width) {
  await sharp(logoBoard)
    .extract(crop)
    .resize({ width, withoutEnlargement: false })
    .webp({ quality: 92 })
    .toFile(path.join(brandDir, name));
}

async function writePngIcon(name, size) {
  await sharp(logoBoard)
    .extract(crops.appIcon)
    .resize(size, size, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(brandDir, name));
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

async function writeFavicon() {
  const iconSizes = [16, 32, 48, 64, 128, 256];
  const pngs = await Promise.all(
    iconSizes.map((size) =>
      sharp(logoBoard)
        .extract(crops.appIcon)
        .resize(size, size, { fit: "cover" })
        .png({ compressionLevel: 9 })
        .toBuffer()
    )
  );
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

  await writeFile(path.join(root, "public", "favicon.ico"), Buffer.concat([header, ...entries, ...pngs]));
}

async function main() {
  await mkdir(brandDir, { recursive: true });
  await readFile(logoBoard);

  await writeWebpCrop("logo-zh.webp", crops.logoZh, 1328);
  await writeWebpCrop("logo-en.webp", crops.logoEn, 1048);
  await writeWebpCrop("header-logo-zh.webp", crops.headerLogoZh, 456);
  await writeWebpCrop("header-logo-en.webp", crops.headerLogoEn, 550);
  await writePngIcon("app-icon-1024.png", 1024);
  await writePngIcon("app-icon-512.png", 512);
  await writePngIcon("app-icon-192.png", 192);
  await writeFavicon();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
