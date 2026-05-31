import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function readProjectFile(path: string) {
  return readFileSync(join(projectRoot, path), "utf8");
}

function readCssRule(source: string, selector: string) {
  const start = source.indexOf(`${selector} {`);

  if (start === -1) {
    return "";
  }

  const end = source.indexOf("\n}", start);
  return end === -1 ? source.slice(start) : source.slice(start, end + 2);
}

describe("signed-in page surface design", () => {
  const signedInPages = [
    "src/app/[locale]/app/page.tsx",
    "src/app/[locale]/preferences/page.tsx",
    "src/app/[locale]/history/page.tsx",
    "src/app/[locale]/settings/openai-key/page.tsx"
  ];

  it("removes card components from every signed-in page reached from the app menu", () => {
    for (const path of signedInPages) {
      const pageSource = readProjectFile(path);

      expect(pageSource, path).not.toContain("@/components/ui/card");
      expect(pageSource, path).not.toContain("<Card");
    }
  });

  it("uses an open table canvas for the recommendation page instead of a framed card", () => {
    const pageSource = readProjectFile("src/app/[locale]/app/page.tsx");
    const globalCss = readProjectFile("src/app/globals.css");
    const tableCanvasRule = readCssRule(globalCss, ".app-table-canvas");

    expect(pageSource).toContain("app-table-canvas");
    expect(pageSource).toContain("app-table-plate");
    expect(tableCanvasRule).not.toContain("box-shadow:");
    expect(tableCanvasRule).not.toMatch(/\n\s*border:/);
  });

  it("keeps the recommendation page minimal while preserving an accessible title and generate action", () => {
    const pageSource = readProjectFile("src/app/[locale]/app/page.tsx");
    const hasHiddenHeading =
      pageSource.includes('className="sr-only"') &&
      pageSource.includes('id="recommend-page-title"') &&
      pageSource.includes('aria-labelledby="recommend-page-title"');
    const hasAriaLabel = pageSource.includes('aria-label={t("title")}');

    expect(pageSource).not.toContain("app-page-heading");
    expect(pageSource).not.toContain("app-table-description");
    expect(pageSource).not.toContain("app-table-model-note");
    expect(pageSource).not.toContain("ImageIcon");
    expect(pageSource).not.toContain("MEAL_IMAGE_MODEL");
    expect(pageSource).not.toContain("TEXT_RECOMMENDATION_MODEL");
    expect(hasHiddenHeading || hasAriaLabel).toBe(true);
    expect(pageSource).toContain("app-table-button");
    expect(pageSource).toContain('t("generate")');
  });

  it("defines shared full-width workbench surfaces for menu pages without changing the paper card component", () => {
    const globalCss = readProjectFile("src/app/globals.css");
    const workbenchPageRule = readCssRule(globalCss, ".app-workbench-page");
    const workbenchFormRule = readCssRule(globalCss, ".app-workbench-form");

    expect(globalCss).toContain(".app-table-canvas");
    expect(globalCss).toContain(".app-table-plate");
    expect(globalCss).toContain(".app-workbench-page");
    expect(globalCss).toContain(".app-workbench-surface");
    expect(globalCss).toContain(".app-paper-card");
    expect(workbenchPageRule).toContain("width: 100%");
    expect(workbenchPageRule).not.toContain("max-width");
    expect(workbenchFormRule).toContain("width: 100%");
    expect(workbenchFormRule).not.toContain("max-width");
  });

  it("avoids viewport-height minimums on the minimal recommendation surface", () => {
    const globalCss = readProjectFile("src/app/globals.css");

    expect(globalCss).not.toMatch(/\.app-table-page-minimal\s*{[^}]*min-height:\s*calc\(100svh/s);
    expect(globalCss).not.toMatch(/\.app-table-canvas-minimal\s*{[^}]*min-height:\s*calc\(100svh/s);
  });
});
