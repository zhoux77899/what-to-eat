import path from "node:path";

import { describe, expect, it } from "vitest";

import { resolveLocalCodexCliPath } from "@/server/generation-adapter";

const appRootCodexCliPath = path.join(
  process.cwd(),
  "node_modules",
  "@openai",
  "codex",
  "bin",
  "codex.js"
);

describe("Local Codex CLI path resolution", () => {
  it("resolves the CLI from the real app node_modules path without createRequire", () => {
    const resolved = resolveLocalCodexCliPath({
      cwd: process.cwd()
    });

    expect(resolved).toBe(appRootCodexCliPath);
    expect(resolved).not.toContain(`${path.sep}(rsc)${path.sep}`);
  });
});
