import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("recommend route skeleton", () => {
  it("names placeholder calculations instead of discarding them with void", () => {
    const routeSource = readFileSync(
      path.join(process.cwd(), "src", "app", "api", "recommend", "route.ts"),
      "utf8"
    );

    expect(routeSource).not.toContain("void mergePreferences");
    expect(routeSource).not.toContain("void windowStart.toISOString()");
    expect(routeSource).toContain("const effectivePreferences = mergePreferences");
    expect(routeSource).toContain("const rateLimitWindowStartIso = windowStart.toISOString()");
  });
});
