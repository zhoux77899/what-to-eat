import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("recommend route", () => {
  it("delegates generation without persisting transient recommendation inputs", () => {
    const routeSource = readFileSync(
      path.join(process.cwd(), "src", "app", "api", "recommend", "route.ts"),
      "utf8"
    );

    expect(routeSource).toContain("createRecommendation");
    expect(routeSource).not.toContain("effectivePreferencesJson");
    expect(routeSource).not.toContain("inputJson");
    expect(routeSource).not.toContain("resultJson");
    expect(routeSource).not.toContain("imageMetadataJson");
  });
});

describe("image-capable API routes", () => {
  const routeFiles = [
    path.join("src", "app", "api", "recommend", "route.ts"),
    path.join("src", "app", "api", "fridge-items", "route.ts"),
    path.join("src", "app", "api", "fridge-items", "[itemId]", "route.ts"),
    path.join("src", "app", "api", "fridge-items", "[itemId]", "retry-image", "route.ts"),
    path.join("src", "app", "api", "recommendations", "[dishId]", "retry-image", "route.ts")
  ];

  it("uses Node.js runtime and a Vercel function window that exceeds image deadlines", () => {
    for (const routeFile of routeFiles) {
      const routeSource = readFileSync(path.join(process.cwd(), routeFile), "utf8");

      expect(routeSource).toContain('export const runtime = "nodejs";');
      expect(routeSource).toContain("export const maxDuration = 300;");
    }
  });
});
