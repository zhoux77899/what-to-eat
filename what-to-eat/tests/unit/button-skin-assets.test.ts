import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import sharp from "sharp";
import { describe, expect, it } from "vitest";

const tones = ["primary", "secondary", "danger"] as const;
const states = ["default", "hover", "pressed"] as const;
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
] as const;
const cornerNames = ["top-left", "top-right", "bottom-left", "bottom-right"] as const;

type ManifestAsset = {
  source: { x: number; y: number; width: number; height: number };
  anchor: string;
  size: {
    source: { width: number; height: number };
    css: { width: number; height: number };
  };
  repeat: string;
};

type Manifest = {
  version: number;
  sourceScale: number;
  runtime: {
    leftTrack: number;
    rightTrack: number;
    topTrack: number;
    bottomTrack: number;
    overlap: number;
  };
  assets: Record<string, Record<string, Record<string, ManifestAsset>>>;
};

async function readRaw(path: string) {
  return sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

function alphaGeometry(data: Buffer) {
  const alpha = Buffer.alloc(data.length / 4);
  for (let source = 3, target = 0; source < data.length; source += 4, target += 1) {
    alpha[target] = data[source];
  }
  return alpha;
}

function hasOpaquePixelInRow(data: Buffer, width: number, y: number) {
  for (let x = 0; x < width; x += 1) {
    if (data[(y * width + x) * 4 + 3] !== 0) return true;
  }
  return false;
}

function hasOpaquePixelInColumn(data: Buffer, width: number, height: number, x: number) {
  for (let y = 0; y < height; y += 1) {
    if (data[(y * width + x) * 4 + 3] !== 0) return true;
  }
  return false;
}

describe("button master assets", () => {
  it("provides nine flat 360x108 masters with stable alpha geometry", async () => {
    for (const tone of tones) {
      let defaultAlpha: Buffer | null = null;

      for (const state of states) {
        const path = join(
          process.cwd(),
          "assets",
          "ui",
          "buttons",
          "masters",
          `${tone}-${state}.png`
        );
        const { data, info } = await readRaw(path);

        expect([info.width, info.height]).toEqual([360, 108]);
        expect(data[3]).toBe(0);
        expect(data[(359 * 4) + 3]).toBe(0);
        expect(data[((107 * 360) * 4) + 3]).toBe(0);
        expect(data[(((107 * 360) + 359) * 4) + 3]).toBe(0);

        const centerColors = new Set<string>();
        for (let y = 34; y < 74; y += 1) {
          for (let x = 82; x < 278; x += 1) {
            const offset = (y * 360 + x) * 4;
            expect(data[offset + 3]).toBe(255);
            centerColors.add(`${data[offset]},${data[offset + 1]},${data[offset + 2]}`);
          }
        }
        expect(centerColors).toHaveLength(1);

        const alpha = alphaGeometry(data);
        if (defaultAlpha === null) defaultAlpha = alpha;
        else expect(alpha.equals(defaultAlpha)).toBe(true);
      }
    }
  });

  it("records prompts, source hashes, output hashes, and state transforms", async () => {
    const audit = JSON.parse(
      await readFile(
        join(process.cwd(), "assets", "ui", "buttons", "master-generation.json"),
        "utf8"
      )
    ) as {
      tones: Record<
        string,
        {
          prompt: string;
          generatedSourceSha256: string;
          outputMasterSha256: Record<string, string>;
          states: Record<string, { deltaOklab: number[] }>;
        }
      >;
    };

    for (const tone of tones) {
      expect(audit.tones[tone].prompt).toContain("perfectly uniform, opaque flat");
      expect(audit.tones[tone].generatedSourceSha256).toMatch(/^[a-f0-9]{64}$/);
      for (const state of states) {
        const master = await readFile(
          join(
            process.cwd(),
            "assets",
            "ui",
            "buttons",
            "masters",
            `${tone}-${state}.png`
          )
        );
        expect(audit.tones[tone].outputMasterSha256[state]).toBe(
          createHash("sha256").update(master).digest("hex")
        );
        expect(audit.tones[tone].states[state].deltaOklab).toHaveLength(3);
      }
    }
  });
});

describe("button skin assets", () => {
  it("provides 81 minimal lossless WebP slices and a complete manifest", async () => {
    const manifest = JSON.parse(
      await readFile(join(process.cwd(), "public", "ui", "buttons", "slices", "manifest.json"), "utf8")
    ) as Manifest;
    let assetCount = 0;

    expect(manifest.version).toBe(2);
    expect(manifest.sourceScale).toBe(2);
    expect(manifest.runtime).toEqual({
      leftTrack: 13,
      rightTrack: 13,
      topTrack: 13,
      bottomTrack: 13,
      overlap: 1
    });

    for (const tone of tones) {
      for (const state of states) {
        const directory = join(process.cwd(), "public", "ui", "buttons", "slices", tone, state);
        const files = (await readdir(directory)).sort();
        expect(files).toEqual(sliceNames.map((name) => `${name}.webp`).sort());

        for (const name of sliceNames) {
          const path = join(directory, `${name}.webp`);
          const metadata = await sharp(path).metadata();
          const record = manifest.assets[tone][state][name];

          expect(metadata.format).toBe("webp");
          expect([metadata.width, metadata.height]).toEqual([
            record.size.source.width,
            record.size.source.height
          ]);
          expect(record.anchor).toBeTruthy();
          assetCount += 1;
        }

        for (const name of cornerNames) {
          const path = join(directory, `${name}.webp`);
          const { data, info } = await readRaw(path);
          expect([info.width, info.height]).toEqual([26, 26]);
          expect(hasOpaquePixelInRow(data, info.width, 0)).toBe(true);
          expect(hasOpaquePixelInRow(data, info.width, info.height - 1)).toBe(true);
          expect(hasOpaquePixelInColumn(data, info.width, info.height, 0)).toBe(true);
          expect(hasOpaquePixelInColumn(data, info.width, info.height, info.width - 1)).toBe(true);
        }

        for (const name of ["top", "bottom"] as const) {
          expect(manifest.assets[tone][state][name].size.source.width).toBe(2);
          expect(manifest.assets[tone][state][name].repeat).toBe("repeat-x");
        }
        for (const name of ["left", "right"] as const) {
          expect(manifest.assets[tone][state][name].size.source.height).toBe(2);
          expect(manifest.assets[tone][state][name].repeat).toBe("repeat-y");
        }

        const centerPath = join(directory, "center.webp");
        const { data: center, info } = await readRaw(centerPath);
        expect([info.width, info.height]).toEqual([2, 2]);
        const colors = new Set<string>();
        for (let offset = 0; offset < center.length; offset += 4) {
          expect(center[offset + 3]).toBe(255);
          colors.add(`${center[offset]},${center[offset + 1]},${center[offset + 2]}`);
        }
        expect(colors).toHaveLength(1);
      }

      for (const name of sliceNames) {
        const baseline = manifest.assets[tone].default[name];
        for (const state of ["hover", "pressed"] as const) {
          expect(manifest.assets[tone][state][name].source).toEqual(baseline.source);
          expect(manifest.assets[tone][state][name].size).toEqual(baseline.size);
          expect(manifest.assets[tone][state][name].anchor).toBe(baseline.anchor);
        }
      }
    }

    expect(assetCount).toBe(81);
  });
});
