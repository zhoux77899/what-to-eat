import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("root route", () => {
  it("redirects the bare project URL to the default Chinese locale", () => {
    const rootPagePath = path.join(process.cwd(), "src", "app", "page.tsx");

    expect(existsSync(rootPagePath)).toBe(true);

    const rootPageSource = readFileSync(rootPagePath, "utf8");

    expect(rootPageSource).toContain('from "next/navigation"');
    expect(rootPageSource).toContain('redirect("/zh")');
  });
});
