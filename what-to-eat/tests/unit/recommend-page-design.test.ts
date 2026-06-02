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
    "src/app/[locale]/fridge/page.tsx",
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
    expect(globalCss).not.toMatch(/\.app-table-canvas(?:-minimal)?::before/);
    expect(globalCss).not.toMatch(/\.app-table-canvas(?:-minimal)?::after/);
  });

  it("keeps the recommendation page minimal while preserving an accessible title and generate action", () => {
    const pageSource = readProjectFile("src/app/[locale]/app/page.tsx");
    const workbenchSource = readProjectFile("src/components/recommend-workbench.tsx");
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
    expect(workbenchSource).toContain("app-table-button");
    expect(workbenchSource).toContain('t("generate")');
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

  it("keeps fridge beside recommendation as a primary navigation destination", () => {
    const appShellSource = readProjectFile("src/components/app-shell.tsx");
    const menuPanelIndex = appShellSource.indexOf('<div className="app-menu-panel">');
    const fridgeLinkIndex = appShellSource.indexOf('href={`/${locale}/fridge`}');
    const primaryNavigation = appShellSource.slice(0, menuPanelIndex);

    expect(fridgeLinkIndex).toBeGreaterThan(-1);
    expect(fridgeLinkIndex).toBeLessThan(menuPanelIndex);
    expect(primaryNavigation).toContain(
      'isCurrentPath(`/${locale}/fridge`) && "app-nav-primary-active"'
    );
  });

  it("keeps menu-page workbench surfaces open instead of drawing a framed background band", () => {
    const globalCss = readProjectFile("src/app/globals.css");
    const workbenchSurfaceRule = readCssRule(globalCss, ".app-workbench-surface");

    expect(workbenchSurfaceRule).not.toContain("border-block");
    expect(globalCss).not.toContain(".app-workbench-surface::before");
  });

  it("uses one fridge inventory panel before an open sticky form panel", () => {
    const fridgeSource = readProjectFile("src/components/fridge-workbench.tsx");
    const globalCss = readProjectFile("src/app/globals.css");
    const inventoryPanelIndex = fridgeSource.indexOf("app-fridge-inventory-panel");
    const formPanelIndex = fridgeSource.indexOf("app-fridge-form-panel");
    const fridgeWorkspaceRule = readCssRule(globalCss, ".app-fridge-workspace");
    const formPanelRule = readCssRule(globalCss, ".app-fridge-form-panel");
    const mobileEditingFormRule = readCssRule(
      globalCss,
      ".app-fridge-workspace-editing .app-fridge-form-panel"
    );

    expect(inventoryPanelIndex).toBeGreaterThan(-1);
    expect(formPanelIndex).toBeGreaterThan(inventoryPanelIndex);
    expect(fridgeSource).toContain("app-fridge-item-row");
    expect(fridgeSource).not.toContain('className="app-paper-card app-form-card"');
    expect(fridgeWorkspaceRule).toContain("gap: clamp(2rem, 3vw, 2.5rem)");
    expect(fridgeWorkspaceRule).toContain(
      "grid-template-columns: minmax(0, 1fr) minmax(15rem, 18rem)"
    );
    expect(fridgeSource).not.toContain("grid-cols-2");
    expect(formPanelRule).toContain("position: sticky");
    expect(mobileEditingFormRule).toContain("order: -1");
  });

  it("uses compact paper buttons for workbench row actions", () => {
    const fridgeSource = readProjectFile("src/components/fridge-workbench.tsx");
    const openAiKeySource = readProjectFile("src/components/openai-key-workbench.tsx");
    const historySource = readProjectFile("src/components/history-workbench.tsx");
    const recommendSource = readProjectFile("src/components/recommend-workbench.tsx");
    const globalCss = readProjectFile("src/app/globals.css");

    expect(globalCss).toContain(".app-paper-button-compact");
    expect(globalCss).toContain(".app-paper-button-danger");
    expect(fridgeSource).toContain(
      "home-paper-button app-paper-button-compact app-paper-button-secondary"
    );
    expect(fridgeSource).toContain(
      "home-paper-button app-paper-button-compact app-paper-button-danger"
    );
    expect(openAiKeySource).toContain(
      "home-paper-button app-paper-button-compact app-paper-button-secondary"
    );
    expect(openAiKeySource).toContain(
      "home-paper-button app-paper-button-compact app-paper-button-danger"
    );
    expect(historySource).toContain(
      "home-paper-button app-paper-button-compact app-paper-button-secondary"
    );
    expect(recommendSource).toContain(
      "home-paper-button app-paper-button-compact app-paper-button-primary"
    );
  });

  it("avoids viewport-height minimums on the minimal recommendation surface", () => {
    const globalCss = readProjectFile("src/app/globals.css");

    expect(globalCss).not.toMatch(/\.app-table-page-minimal\s*{[^}]*min-height:\s*calc\(100svh/s);
    expect(globalCss).not.toMatch(/\.app-table-canvas-minimal\s*{[^}]*min-height:\s*calc\(100svh/s);
  });
});
