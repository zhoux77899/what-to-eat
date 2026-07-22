import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import sharp from "sharp";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const mastersRoot = path.join(projectRoot, "assets", "ui", "buttons", "masters");
const auditPath = path.join(projectRoot, "assets", "ui", "buttons", "master-generation.json");

const tones = ["primary", "secondary", "danger"];
const states = ["default", "hover", "pressed"];
const canvas = { width: 360, height: 108 };
const canonicalBounds = { left: 28, top: 4, width: 304, height: 100 };

const prompts = {
  primary: `Use case: precise-object-edit
Asset type: Japanese anime cooking-game UI button background master
Input images: Image 1 is the edit target and exact geometry reference.
Primary request: Remove only the visible mottled paper/fabric texture from the olive-green interior. Rebuild the interior as one perfectly uniform, opaque flat olive-green color sampled from the original image.
Composition: Preserve the exact wide rounded-rectangle silhouette, proportions, padding, and centered placement of Image 1.
Style: Preserve the original hand-drawn Japanese game UI style.
Constraints: Keep the corner flourishes, pale-gold inner highlights, dark double outline, lower shadow, antialiased edges, original olive-green palette, and every decorative line in exactly the same position and thickness. Change only the interior texture. No gradient, noise, grain, paper texture, fabric texture, lighting variation, text, icon, watermark, or new decoration.
Backdrop: Place the entire button on one perfectly flat solid #00FFFF chroma-key background. The backdrop must contain no shadows, gradients, texture, reflections, or color variation. Do not use #00FFFF anywhere inside the button.`,
  secondary: `Use case: precise-object-edit
Asset type: Japanese anime cooking-game UI button background master
Input images: Image 1 is the edit target and exact geometry reference.
Primary request: Remove only the visible paper texture from the warm ivory interior. Rebuild the interior as one perfectly uniform, opaque flat warm-ivory color sampled from the original image.
Composition: Preserve the exact wide rounded-rectangle silhouette, proportions, padding, and centered placement of Image 1.
Style: Preserve the original hand-drawn Japanese game UI style.
Constraints: Keep the corner flourishes, pale-gold inner highlights, dark double outline, lower shadow, antialiased edges, original warm-ivory palette, and every decorative line in exactly the same position and thickness. Change only the interior texture. No gradient, noise, grain, paper texture, fabric texture, lighting variation, text, icon, watermark, or new decoration.
Backdrop: Place the entire button on one perfectly flat solid #00FFFF chroma-key background. The backdrop must contain no shadows, gradients, texture, reflections, or color variation. Do not use #00FFFF anywhere inside the button.`,
  danger: `Use case: precise-object-edit
Asset type: Japanese anime cooking-game UI button background master
Input images: Image 1 is the edit target and exact geometry reference.
Primary request: Remove only the visible mottled paper/fabric texture from the vivid red interior. Rebuild the interior as one perfectly uniform, opaque flat vivid-red color sampled from the original image.
Composition: Preserve the exact wide rounded-rectangle silhouette, proportions, padding, and centered placement of Image 1.
Style: Preserve the original hand-drawn Japanese game UI style.
Constraints: Keep the corner flourishes, pale-gold inner highlights, dark double outline, lower shadow, antialiased edges, original vivid-red palette, and every decorative line in exactly the same position and thickness. Change only the interior texture. No gradient, noise, grain, paper texture, fabric texture, lighting variation, text, icon, watermark, or new decoration.
Backdrop: Place the entire button on one perfectly flat solid #00FFFF chroma-key background. The backdrop must contain no shadows, gradients, texture, reflections, or color variation. Do not use #00FFFF anywhere inside the button.`
};

function parseArguments() {
  const values = {};

  for (let index = 2; index < process.argv.length; index += 2) {
    const name = process.argv[index]?.replace(/^--/, "");
    const value = process.argv[index + 1];

    if (!name || !value) {
      throw new Error("Expected --primary, --secondary, and --danger image paths.");
    }

    values[name] = path.resolve(value);
  }

  for (const tone of tones) {
    if (!values[tone]) {
      throw new Error(`Missing --${tone} generated image path.`);
    }
  }

  return values;
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function srgbToLinear(value) {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(value) {
  const normalized = value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
  return Math.round(clamp(normalized) * 255);
}

function rgbToOklab([red, green, blue]) {
  const r = srgbToLinear(red);
  const g = srgbToLinear(green);
  const b = srgbToLinear(blue);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  ];
}

function oklabToRgb([lightness, greenRed, blueYellow]) {
  const l = (lightness + 0.3963377774 * greenRed + 0.2158037573 * blueYellow) ** 3;
  const m = (lightness - 0.1055613458 * greenRed - 0.0638541728 * blueYellow) ** 3;
  const s = (lightness - 0.0894841775 * greenRed - 1.291485548 * blueYellow) ** 3;

  return [
    linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)
  ];
}

function colorDistance(left, right) {
  return Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);
}

function colorToHex([red, green, blue]) {
  return `#${[red, green, blue].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

async function normalizeMaster(input) {
  const visibleArtwork = await sharp(input)
    .ensureAlpha()
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .resize(canonicalBounds.width, canonicalBounds.height, {
      fit: "fill",
      kernel: sharp.kernel.lanczos3
    })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: canvas.width,
      height: canvas.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{ input: visibleArtwork, left: canonicalBounds.left, top: canonicalBounds.top }])
    .png()
    .toBuffer();
}

async function rawImage(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  if (info.width !== canvas.width || info.height !== canvas.height || info.channels !== 4) {
    throw new Error(`Expected a ${canvas.width}x${canvas.height} RGBA image.`);
  }

  return { data: Buffer.from(data), info };
}

function sampleMasterFill(data) {
  const channels = [[], [], []];

  for (let y = 36; y < 72; y += 1) {
    for (let x = 120; x < 240; x += 1) {
      const offset = (y * canvas.width + x) * 4;
      if (data[offset + 3] < 250) continue;
      channels[0].push(data[offset]);
      channels[1].push(data[offset + 1]);
      channels[2].push(data[offset + 2]);
    }
  }

  return channels.map(median);
}

async function sampleGeneratedFill(inputPath) {
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let foregroundCount = 0;
  let left = Infinity;
  let right = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * info.channels;
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      const alpha = info.channels === 4 ? data[offset + 3] : 255;
      const isCyanKey = red < 90 && green > 170 && blue > 170;

      if (alpha > 10 && !isCyanKey) {
        foregroundCount += 1;
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }

  if (foregroundCount === 0) throw new Error(`No button foreground found in ${inputPath}.`);

  const bounds = {
    left,
    right,
    top,
    bottom
  };
  const sampleBounds = {
    left: Math.round(bounds.left + (bounds.right - bounds.left) * 0.35),
    right: Math.round(bounds.left + (bounds.right - bounds.left) * 0.65),
    top: Math.round(bounds.top + (bounds.bottom - bounds.top) * 0.35),
    bottom: Math.round(bounds.top + (bounds.bottom - bounds.top) * 0.65)
  };
  const channels = [[], [], []];

  for (let y = sampleBounds.top; y <= sampleBounds.bottom; y += 1) {
    for (let x = sampleBounds.left; x <= sampleBounds.right; x += 1) {
      const offset = (y * info.width + x) * info.channels;
      channels[0].push(data[offset]);
      channels[1].push(data[offset + 1]);
      channels[2].push(data[offset + 2]);
    }
  }

  return channels.map(median);
}

function createFillMask(data, referenceFill) {
  const mask = new Uint8Array(canvas.width * canvas.height);

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const pixel = y * canvas.width + x;
      const offset = pixel * 4;
      if (data[offset + 3] === 0) continue;

      const color = [data[offset], data[offset + 1], data[offset + 2]];
      const safeInterior = x >= 76 && x < 284 && y >= 30 && y < 78;
      const fillLike = colorDistance(color, referenceFill) <= 72;
      mask[pixel] = safeInterior || fillLike ? 1 : 0;
    }
  }

  return mask;
}

function rebuildDefault(data, mask, fill) {
  const output = Buffer.from(data);

  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    if (!mask[pixel]) continue;
    const offset = pixel * 4;
    output[offset] = fill[0];
    output[offset + 1] = fill[1];
    output[offset + 2] = fill[2];
  }

  return output;
}

function deriveState({ newDefault, oldDefault, oldState, mask, oldDefaultFill, oldStateFill, generatedFill }) {
  const output = Buffer.alloc(newDefault.length);
  const defaultFillLab = rgbToOklab(oldDefaultFill);
  const stateFillLab = rgbToOklab(oldStateFill);
  const generatedFillLab = rgbToOklab(generatedFill);
  const delta = stateFillLab.map((value, index) => value - defaultFillLab[index]);
  const derivedFill = oklabToRgb(generatedFillLab.map((value, index) => value + delta[index]));

  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    const offset = pixel * 4;
    const alpha = newDefault[offset + 3];

    if (alpha === 0) continue;

    if (mask[pixel]) {
      output[offset] = derivedFill[0];
      output[offset + 1] = derivedFill[1];
      output[offset + 2] = derivedFill[2];
      output[offset + 3] = alpha;
      continue;
    }

    const baseColor = [oldDefault[offset], oldDefault[offset + 1], oldDefault[offset + 2]];
    const stateColor = [oldState[offset], oldState[offset + 1], oldState[offset + 2]];
    const newColor = [newDefault[offset], newDefault[offset + 1], newDefault[offset + 2]];
    const baseLab = rgbToOklab(baseColor);
    const stateLab = rgbToOklab(stateColor);
    const newLab = rgbToOklab(newColor);
    const derivedColor = oklabToRgb(
      newLab.map((value, index) => value + stateLab[index] - baseLab[index])
    );

    output[offset] = derivedColor[0];
    output[offset + 1] = derivedColor[1];
    output[offset + 2] = derivedColor[2];
    output[offset + 3] = alpha;
  }

  return { output, derivedFill, delta };
}

async function writeRawPng(data, targetPath) {
  await sharp(data, { raw: { width: canvas.width, height: canvas.height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(targetPath);
}

const generatedSources = parseArguments();
const audit = {
  generator: "built-in ImageGen precise-object-edit with deterministic Sharp reconstruction",
  canvas,
  canonicalBounds,
  tones: {}
};

for (const tone of tones) {
  const originalBuffers = {};
  const normalizedBuffers = {};

  for (const state of states) {
    const sourcePath = path.join(mastersRoot, `${tone}-${state}.png`);
    originalBuffers[state] = await readFile(sourcePath);
    normalizedBuffers[state] = await normalizeMaster(originalBuffers[state]);
  }

  const rawStates = {};
  for (const state of states) rawStates[state] = await rawImage(normalizedBuffers[state]);

  const oldFills = Object.fromEntries(
    states.map((state) => [state, sampleMasterFill(rawStates[state].data)])
  );
  const generatedSource = await readFile(generatedSources[tone]);
  const generatedFill = await sampleGeneratedFill(generatedSources[tone]);
  const mask = createFillMask(rawStates.default.data, oldFills.default);
  const rebuiltDefault = rebuildDefault(rawStates.default.data, mask, generatedFill);
  const outputs = { default: rebuiltDefault };
  const stateAudit = {
    default: { fill: colorToHex(generatedFill), deltaOklab: [0, 0, 0] }
  };

  for (const state of ["hover", "pressed"]) {
    const derived = deriveState({
      newDefault: rebuiltDefault,
      oldDefault: rawStates.default.data,
      oldState: rawStates[state].data,
      mask,
      oldDefaultFill: oldFills.default,
      oldStateFill: oldFills[state],
      generatedFill
    });
    outputs[state] = derived.output;
    stateAudit[state] = {
      fill: colorToHex(derived.derivedFill),
      deltaOklab: derived.delta.map((value) => Number(value.toFixed(8)))
    };
  }

  const outputHashes = {};
  for (const state of states) {
    const targetPath = path.join(mastersRoot, `${tone}-${state}.png`);
    await writeRawPng(outputs[state], targetPath);
    outputHashes[state] = sha256(await readFile(targetPath));
  }

  audit.tones[tone] = {
    prompt: prompts[tone],
    generatedSourceSha256: sha256(generatedSource),
    originalMasterSha256: Object.fromEntries(
      states.map((state) => [state, sha256(originalBuffers[state])])
    ),
    outputMasterSha256: outputHashes,
    states: stateAudit
  };
}

await writeFile(auditPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
console.log(`Rebuilt ${tones.length * states.length} texture-free button masters.`);
