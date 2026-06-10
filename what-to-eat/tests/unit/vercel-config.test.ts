import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(testDir, "..", "..");

describe("Vercel project configuration", () => {
  it("pins the framework preset to Next.js for the nested app deployment", () => {
    const configPath = path.join(appRoot, "vercel.json");

    expect(existsSync(configPath)).toBe(true);

    const config = JSON.parse(readFileSync(configPath, "utf8")) as {
      $schema?: string;
      framework?: string;
    };

    expect(config).toMatchObject({
      $schema: "https://openapi.vercel.sh/vercel.json",
      framework: "nextjs"
    });
  });
});
