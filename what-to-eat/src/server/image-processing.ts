import { deflateSync, inflateSync } from "node:zlib";

import { CHROMA_KEY_COLOR } from "@/server/image-prompts";

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const targetSize = 512;
const chromaKey = parseHexColor(CHROMA_KEY_COLOR);
const exactChromaKeyTolerance = 2;

export type RgbaImage = {
  width: number;
  height: number;
  data: Uint8Array;
};

export function removeChromaKeyBackground(input: Buffer | Uint8Array) {
  const decoded = decodeRgbaPng(input);
  const resized = resizeNearest(decoded, targetSize, targetSize);
  const backgroundPixels = findEdgeConnectedChromaKeyPixels(resized);

  for (let index = 0; index < resized.data.length; index += 4) {
    const pixelIndex = index / 4;

    if (backgroundPixels[pixelIndex] || isExactChromaKeyPixel(resized.data, index)) {
      resized.data[index + 3] = 0;
    }
  }

  return encodeRgbaPng(resized);
}

export function decodeRgbaPng(input: Buffer | Uint8Array): RgbaImage {
  const bytes = Buffer.from(input);

  if (!bytes.subarray(0, pngSignature.length).equals(pngSignature)) {
    throw new Error("Invalid PNG signature.");
  }

  let offset = pngSignature.length;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlaceMethod = 0;
  const idatChunks: Buffer[] = [];

  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    offset += 4;
    const type = bytes.subarray(offset, offset + 4).toString("ascii");
    offset += 4;
    const data = bytes.subarray(offset, offset + length);
    offset += length + 4;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8]!;
      colorType = data[9]!;
      interlaceMethod = data[12]!;
    } else if (type === "IDAT") {
      idatChunks.push(Buffer.from(data));
    } else if (type === "IEND") {
      break;
    }
  }

  if (width <= 0 || height <= 0 || bitDepth !== 8 || interlaceMethod !== 0) {
    throw new Error("Unsupported PNG format.");
  }

  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;

  if (channels === 0) {
    throw new Error("Unsupported PNG color type.");
  }

  const inflated = inflateSync(Buffer.concat(idatChunks));
  const scanlineLength = width * channels;
  const data = new Uint8Array(width * height * 4);
  let inputOffset = 0;
  let previousRow = new Uint8Array(scanlineLength);

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[inputOffset]!;
    inputOffset += 1;
    const row = new Uint8Array(scanlineLength);

    for (let x = 0; x < scanlineLength; x += 1) {
      const raw = inflated[inputOffset]!;
      inputOffset += 1;
      const left = x >= channels ? row[x - channels]! : 0;
      const up = previousRow[x] ?? 0;
      const upLeft = x >= channels ? previousRow[x - channels] ?? 0 : 0;

      row[x] = (raw + predictFilterByte(filter, left, up, upLeft)) & 255;
    }

    for (let x = 0; x < width; x += 1) {
      const rowOffset = x * channels;
      const outputOffset = (y * width + x) * 4;

      data[outputOffset] = row[rowOffset]!;
      data[outputOffset + 1] = row[rowOffset + 1]!;
      data[outputOffset + 2] = row[rowOffset + 2]!;
      data[outputOffset + 3] = channels === 4 ? row[rowOffset + 3]! : 255;
    }

    previousRow = row;
  }

  return { width, height, data };
}

export function encodeRgbaPng(image: RgbaImage) {
  if (image.width <= 0 || image.height <= 0 || image.data.length !== image.width * image.height * 4) {
    throw new Error("Invalid RGBA image.");
  }

  const scanlineLength = image.width * 4;
  const raw = Buffer.alloc((scanlineLength + 1) * image.height);
  let rawOffset = 0;

  for (let y = 0; y < image.height; y += 1) {
    raw[rawOffset] = 0;
    rawOffset += 1;
    const rowStart = y * scanlineLength;
    raw.set(image.data.subarray(rowStart, rowStart + scanlineLength), rawOffset);
    rawOffset += scanlineLength;
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(image.width, 0);
  ihdr.writeUInt32BE(image.height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    pngSignature,
    createChunk("IHDR", ihdr),
    createChunk("IDAT", deflateSync(raw)),
    createChunk("IEND", Buffer.alloc(0))
  ]);
}

function resizeNearest(image: RgbaImage, width: number, height: number): RgbaImage {
  if (image.width === width && image.height === height) {
    return { width, height, data: new Uint8Array(image.data) };
  }

  const data = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(image.height - 1, Math.floor((y * image.height) / height));

    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(image.width - 1, Math.floor((x * image.width) / width));
      const sourceOffset = (sourceY * image.width + sourceX) * 4;
      const outputOffset = (y * width + x) * 4;

      data[outputOffset] = image.data[sourceOffset]!;
      data[outputOffset + 1] = image.data[sourceOffset + 1]!;
      data[outputOffset + 2] = image.data[sourceOffset + 2]!;
      data[outputOffset + 3] = image.data[sourceOffset + 3]!;
    }
  }

  return { width, height, data };
}

function findEdgeConnectedChromaKeyPixels(image: RgbaImage) {
  const { data, height, width } = image;
  const backgroundPixels = new Uint8Array(width * height);
  const stack: number[] = [];

  const pushIfChromaKey = (x: number, y: number) => {
    const pixelIndex = y * width + x;

    if (backgroundPixels[pixelIndex]) {
      return;
    }

    if (!isChromaKeyBackgroundCandidate(data, pixelIndex * 4)) {
      return;
    }

    backgroundPixels[pixelIndex] = 1;
    stack.push(pixelIndex);
  };

  for (let x = 0; x < width; x += 1) {
    pushIfChromaKey(x, 0);
    pushIfChromaKey(x, height - 1);
  }

  for (let y = 1; y < height - 1; y += 1) {
    pushIfChromaKey(0, y);
    pushIfChromaKey(width - 1, y);
  }

  while (stack.length > 0) {
    const pixelIndex = stack.pop()!;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);

    if (x > 0) {
      pushIfChromaKey(x - 1, y);
    }

    if (x < width - 1) {
      pushIfChromaKey(x + 1, y);
    }

    if (y > 0) {
      pushIfChromaKey(x, y - 1);
    }

    if (y < height - 1) {
      pushIfChromaKey(x, y + 1);
    }
  }

  return backgroundPixels;
}

function isExactChromaKeyPixel(data: Uint8Array, index: number) {
  return (
    Math.abs(data[index]! - chromaKey.red) <= exactChromaKeyTolerance &&
    Math.abs(data[index + 1]! - chromaKey.green) <= exactChromaKeyTolerance &&
    Math.abs(data[index + 2]! - chromaKey.blue) <= exactChromaKeyTolerance
  );
}

function isChromaKeyBackgroundCandidate(data: Uint8Array, index: number) {
  const red = data[index]!;
  const green = data[index + 1]!;
  const blue = data[index + 2]!;

  if (isExactChromaKeyPixel(data, index)) {
    return true;
  }

  const redDistance = Math.abs(red - chromaKey.red);
  const greenDistance = Math.abs(green - chromaKey.green);
  const blueDistance = Math.abs(blue - chromaKey.blue);

  return (
    red >= 220 &&
    green <= 80 &&
    blue >= 220 &&
    Math.abs(red - blue) <= 36 &&
    Math.max(redDistance, greenDistance, blueDistance) <= 48 &&
    redDistance + greenDistance + blueDistance <= 110
  );
}

function predictFilterByte(filter: number, left: number, up: number, upLeft: number) {
  switch (filter) {
    case 0:
      return 0;
    case 1:
      return left;
    case 2:
      return up;
    case 3:
      return Math.floor((left + up) / 2);
    case 4:
      return paeth(left, up, upLeft);
    default:
      throw new Error("Unsupported PNG filter.");
  }
}

function paeth(left: number, up: number, upLeft: number) {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);

  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) {
    return left;
  }

  if (upDistance <= upLeftDistance) {
    return up;
  }

  return upLeft;
}

function createChunk(type: string, data: Buffer) {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);

  length.writeUInt32BE(data.length, 0);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);

  return Buffer.concat([length, typeBytes, data, crc]);
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 255]! ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function parseHexColor(value: string) {
  const match = value.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/iu);

  if (!match) {
    throw new Error("Invalid chroma key color.");
  }

  return {
    red: Number.parseInt(match[1]!, 16),
    green: Number.parseInt(match[2]!, 16),
    blue: Number.parseInt(match[3]!, 16)
  };
}
