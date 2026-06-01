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
