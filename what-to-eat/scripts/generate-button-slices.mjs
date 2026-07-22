import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import sharp from "sharp";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const sourceRoot = path.join(projectRoot, "assets", "ui", "buttons", "masters");
const outputRoot = path.join(projectRoot, "public", "ui", "buttons", "slices");
const manifestPath = path.join(outputRoot, "manifest.json");
const generatedStylesPath = path.join(
  projectRoot,
  "src",
  "styles",
  "button-skins.generated.css"
);

const tones = ["primary", "secondary", "danger"];
const states = ["default", "hover", "pressed"];
const canvas = { width: 360, height: 108 };
const sourceScale = 2;
const visibleBounds = { left: 28, top: 4, right: 332, bottom: 104 };
const capCuts = { left: 54, right: 306, top: 30, bottom: 78 };
const repeatSample = { x: 179, y: 53, size: 2 };
const sliceNames = [
  "top-left",
  "top",
  "top-right",
  "left",
  "center",
  "right",
  "bottom-left",
  "bottom",
  "bottom-right"
];

function sourceRect(left, top, width, height) {
  return { left, top, width, height };
}

const sourceRects = {
  "top-left": sourceRect(
    visibleBounds.left,
    visibleBounds.top,
    capCuts.left - visibleBounds.left,
    capCuts.top - visibleBounds.top
  ),
  top: sourceRect(
    repeatSample.x,
    visibleBounds.top,
    repeatSample.size,
    capCuts.top - visibleBounds.top
  ),
  "top-right": sourceRect(
    capCuts.right,
    visibleBounds.top,
    visibleBounds.right - capCuts.right,
    capCuts.top - visibleBounds.top
  ),
  left: sourceRect(
    visibleBounds.left,
    repeatSample.y,
    capCuts.left - visibleBounds.left,
    repeatSample.size
  ),
  center: sourceRect(repeatSample.x, repeatSample.y, repeatSample.size, repeatSample.size),
  right: sourceRect(
    capCuts.right,
    repeatSample.y,
    visibleBounds.right - capCuts.right,
    repeatSample.size
  ),
  "bottom-left": sourceRect(
    visibleBounds.left,
    capCuts.bottom,
    capCuts.left - visibleBounds.left,
    visibleBounds.bottom - capCuts.bottom
  ),
  bottom: sourceRect(
    repeatSample.x,
    capCuts.bottom,
    repeatSample.size,
    visibleBounds.bottom - capCuts.bottom
  ),
  "bottom-right": sourceRect(
    capCuts.right,
    capCuts.bottom,
    visibleBounds.right - capCuts.right,
    visibleBounds.bottom - capCuts.bottom
  )
};

function getPixel(data, x, y) {
  const offset = (y * canvas.width + x) * 4;
  return [data[offset], data[offset + 1], data[offset + 2], data[offset + 3]];
}

function isSameOpaqueColor(data, offset, fill) {
  return (
    data[offset] === fill[0] &&
    data[offset + 1] === fill[1] &&
    data[offset + 2] === fill[2] &&
    data[offset + 3] === 255
  );
}

async function readMaster(tone, state) {
  const sourcePath = path.join(sourceRoot, `${tone}-${state}.png`);
  const image = sharp(sourcePath).ensureAlpha();
  const metadata = await image.metadata();

  if (metadata.width !== canvas.width || metadata.height !== canvas.height) {
    throw new Error(
      `${path.basename(sourcePath)} must be ${canvas.width}x${canvas.height}, received ${metadata.width}x${metadata.height}`
    );
  }

  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  if (info.channels !== 4) throw new Error(`${path.basename(sourcePath)} must contain alpha.`);

  const fill = getPixel(data, repeatSample.x, repeatSample.y);
  if (fill[3] !== 255) throw new Error(`${path.basename(sourcePath)} must have an opaque center.`);

  for (let y = 34; y < 74; y += 1) {
    for (let x = 82; x < 278; x += 1) {
      const pixel = getPixel(data, x, y);
      if (pixel.some((value, index) => value !== fill[index])) {
        throw new Error(`${path.basename(sourcePath)} contains center texture at ${x},${y}.`);
      }
    }
  }

  const decoration = Buffer.from(data);
  for (let offset = 0; offset < decoration.length; offset += 4) {
    if (isSameOpaqueColor(decoration, offset, fill)) decoration[offset + 3] = 0;
  }

  return { decoration, fill: fill.slice(0, 3) };
}

function extractRaw(data, rect) {
  const output = Buffer.alloc(rect.width * rect.height * 4);

  for (let y = 0; y < rect.height; y += 1) {
    for (let x = 0; x < rect.width; x += 1) {
      const sourceOffset = ((rect.top + y) * canvas.width + rect.left + x) * 4;
      const targetOffset = (y * rect.width + x) * 4;
      data.copy(output, targetOffset, sourceOffset, sourceOffset + 4);
    }
  }

  return output;
}

function trimRail(data, rect, axis) {
  const raw = extractRaw(data, rect);
  let start = axis === "x" ? rect.width : rect.height;
  let end = -1;

  for (let y = 0; y < rect.height; y += 1) {
    for (let x = 0; x < rect.width; x += 1) {
      if (raw[(y * rect.width + x) * 4 + 3] === 0) continue;
      const coordinate = axis === "x" ? x : y;
      start = Math.min(start, coordinate);
      end = Math.max(end, coordinate);
    }
  }

  if (end < start) throw new Error(`Rail at ${rect.left},${rect.top} has no decoration pixels.`);

  const trimmedRect =
    axis === "x"
      ? { ...rect, left: rect.left + start, width: end - start + 1 }
      : { ...rect, top: rect.top + start, height: end - start + 1 };

  return { data: extractRaw(data, trimmedRect), rect: trimmedRect };
}

function assertTightOuterBounds(data, width, height, fileName) {
  const opaqueInRow = (y) => {
    for (let x = 0; x < width; x += 1) if (data[(y * width + x) * 4 + 3] !== 0) return true;
    return false;
  };
  const opaqueInColumn = (x) => {
    for (let y = 0; y < height; y += 1) if (data[(y * width + x) * 4 + 3] !== 0) return true;
    return false;
  };

  if (
    !opaqueInRow(0) ||
    !opaqueInRow(height - 1) ||
    !opaqueInColumn(0) ||
    !opaqueInColumn(width - 1)
  ) {
    throw new Error(`${fileName} has removable transparent outer rows or columns.`);
  }
}

async function writeWebp(data, width, height, targetPath) {
  await sharp(data, { raw: { width, height, channels: 4 } })
    .webp({ lossless: true, effort: 6 })
    .toFile(targetPath);
}

function assetRecord(rect, anchor, repeat) {
  return {
    source: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
    anchor,
    size: {
      source: { width: rect.width, height: rect.height },
      css: { width: rect.width / sourceScale, height: rect.height / sourceScale }
    },
    repeat
  };
}

async function generateSlices(tone, state) {
  const { decoration, fill } = await readMaster(tone, state);
  const targetDirectory = path.join(outputRoot, tone, state);
  const assets = {};
  await mkdir(targetDirectory, { recursive: true });

  for (const name of ["top-left", "top-right", "bottom-left", "bottom-right"]) {
    const rect = sourceRects[name];
    const raw = extractRaw(decoration, rect);
    assertTightOuterBounds(raw, rect.width, rect.height, `${tone}/${state}/${name}.webp`);
    await writeWebp(raw, rect.width, rect.height, path.join(targetDirectory, `${name}.webp`));
    assets[name] = assetRecord(rect, name, "no-repeat");
  }

  for (const name of ["top", "bottom"]) {
    const { data, rect } = trimRail(decoration, sourceRects[name], "y");
    if (rect.width !== repeatSample.size) throw new Error(`${name} repeat width must be 2px.`);
    assertTightOuterBounds(data, rect.width, rect.height, `${tone}/${state}/${name}.webp`);
    await writeWebp(data, rect.width, rect.height, path.join(targetDirectory, `${name}.webp`));
    assets[name] = assetRecord(rect, name, "repeat-x");
  }

  for (const name of ["left", "right"]) {
    const { data, rect } = trimRail(decoration, sourceRects[name], "x");
    if (rect.height !== repeatSample.size) throw new Error(`${name} repeat height must be 2px.`);
    assertTightOuterBounds(data, rect.width, rect.height, `${tone}/${state}/${name}.webp`);
    await writeWebp(data, rect.width, rect.height, path.join(targetDirectory, `${name}.webp`));
    assets[name] = assetRecord(rect, name, "repeat-y");
  }

  const center = Buffer.alloc(repeatSample.size * repeatSample.size * 4);
  for (let offset = 0; offset < center.length; offset += 4) {
    center[offset] = fill[0];
    center[offset + 1] = fill[1];
    center[offset + 2] = fill[2];
    center[offset + 3] = 255;
  }
  const centerRect = sourceRects.center;
  await writeWebp(
    center,
    repeatSample.size,
    repeatSample.size,
    path.join(targetDirectory, "center.webp")
  );
  assets.center = assetRecord(centerRect, "fill", "repeat");

  return assets;
}

function createRailPositionDeclarations(assets) {
  const topOffset = (assets.top.source.y - visibleBounds.top) / sourceScale;
  const bottomOffset =
    (visibleBounds.bottom - assets.bottom.source.y - assets.bottom.source.height) / sourceScale;
  const leftOffset = (assets.left.source.x - visibleBounds.left) / sourceScale;
  const rightOffset =
    (visibleBounds.right - assets.right.source.x - assets.right.source.width) / sourceScale;

  return [
    `  --app-button-skin-top-offset: ${topOffset}px;`,
    `  --app-button-skin-bottom-offset: ${bottomOffset}px;`,
    `  --app-button-skin-left-offset: ${leftOffset}px;`,
    `  --app-button-skin-right-offset: ${rightOffset}px;`
  ].join("\n");
}

function createGeneratedStyles(runtime, assets) {
  const selectors = [
    `.app-button-skin {\n  --app-button-skin-left-track: ${runtime.leftTrack}px;\n  --app-button-skin-right-track: ${runtime.rightTrack}px;\n  --app-button-skin-top-track: ${runtime.topTrack}px;\n  --app-button-skin-bottom-track: ${runtime.bottomTrack}px;\n  --app-button-skin-overlap: ${runtime.overlap}px;\n}`
  ];

  for (const tone of tones) {
    for (const state of states) {
      const stateSelector =
        state === "default"
          ? `.app-button-skin[data-tone="${tone}"]`
          : state === "hover"
            ? `.app-button-surface:is(:hover, :focus-visible, :focus-within) > .app-button-skin[data-tone="${tone}"]`
            : `.app-button-surface:active > .app-button-skin[data-tone="${tone}"]`;
      const declarations = sliceNames
        .map(
          (slice) =>
            `  --app-button-skin-${slice}: url("/ui/buttons/slices/${tone}/${state}/${slice}.webp");`
        )
        .join("\n");
      const positions = createRailPositionDeclarations(assets[tone][state]);

      selectors.push(`${stateSelector} {\n${declarations}\n${positions}\n}`);
    }

    const disabledDeclarations = sliceNames
      .map(
        (slice) =>
          `  --app-button-skin-${slice}: url("/ui/buttons/slices/${tone}/default/${slice}.webp");`
      )
      .join("\n");
    const disabledPositions = createRailPositionDeclarations(assets[tone].default);
    selectors.push(
      `.app-button-surface:is(:disabled, [aria-disabled="true"]) > .app-button-skin[data-tone="${tone}"] {\n${disabledDeclarations}\n${disabledPositions}\n}`
    );
  }

  return `/* Generated by scripts/generate-button-slices.mjs. Do not edit manually. */\n\n${selectors.join("\n\n")}\n`;
}

async function validateOutput(manifest) {
  let count = 0;

  for (const tone of tones) {
    for (const state of states) {
      const directory = path.join(outputRoot, tone, state);
      const files = (await readdir(directory)).sort();
      const expected = sliceNames.map((name) => `${name}.webp`).sort();
      if (files.join("|") !== expected.join("|")) {
        throw new Error(`${tone}/${state} does not contain the expected nine slices.`);
      }

      for (const name of sliceNames) {
        const metadata = await sharp(path.join(directory, `${name}.webp`)).metadata();
        const expectedSize = manifest.assets[tone][state][name].size.source;
        if (
          metadata.format !== "webp" ||
          metadata.width !== expectedSize.width ||
          metadata.height !== expectedSize.height
        ) {
          throw new Error(`${tone}/${state}/${name}.webp has an invalid output format or size.`);
        }
        count += 1;
      }
    }
  }

  if (count !== 81) throw new Error(`Expected 81 slices, generated ${count}.`);
}

await rm(outputRoot, { recursive: true, force: true });

const capWidth = (capCuts.left - visibleBounds.left) / sourceScale;
const capHeight = (capCuts.top - visibleBounds.top) / sourceScale;
const runtime = {
  leftTrack: capWidth,
  rightTrack: capWidth,
  topTrack: capHeight,
  bottomTrack: capHeight,
  overlap: 1
};
const manifest = {
  version: 2,
  generator: "scripts/generate-button-slices.mjs",
  canvas,
  sourceScale,
  visibleBounds,
  runtime,
  assets: {}
};

for (const tone of tones) {
  manifest.assets[tone] = {};
  for (const state of states) {
    manifest.assets[tone][state] = await generateSlices(tone, state);
  }
}

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
await writeFile(generatedStylesPath, createGeneratedStyles(runtime, manifest.assets), "utf8");
await validateOutput(manifest);

console.log(`Generated ${tones.length * states.length * sliceNames.length} tileable button slices.`);
