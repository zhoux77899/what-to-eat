import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("Next proxy entrypoint", () => {
  const projectRoot = process.cwd();

  it("uses src/proxy.ts as the only Next.js proxy convention file", () => {
    const rootProxyPath = path.join(projectRoot, "proxy.ts");
    const srcProxyPath = path.join(projectRoot, "src", "proxy.ts");
    const srcProxy = readFileSync(srcProxyPath, "utf8");

    expect(existsSync(srcProxyPath)).toBe(true);
    expect(existsSync(rootProxyPath)).toBe(false);
    expect(srcProxy).toContain("@/server/request-proxy");
    expect(srcProxy).not.toContain("../proxy");
    expect(srcProxy).toContain("export const config");
    expect(srcProxy).not.toContain("export { config");
  });
});
