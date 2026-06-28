import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("signed-in product UI design", () => {
  it("keeps the real brand artwork and adds the three-step home workflow", () => {
    const home = read("src/app/[locale]/page.tsx");
    const styles = read("src/styles/redesign.css");

    expect(home).toContain("BrandLogoImage");
    expect(home).toContain("home-hero-steps");
    expect(home).toContain('t("stepFridge")');
    expect(home).toContain('t("stepRecommend")');
    expect(home).toContain('t("stepCook")');
    expect(styles).toContain('url("/images/home-table-hero.png")');
    expect(home).not.toContain("<svg");
  });

  it("uses layered tokens and an active redesign stylesheet instead of the legacy cascade", () => {
    const globals = read("src/app/globals.css");
    const tokens = read("src/styles/tokens.css");
    const styles = read("src/styles/redesign.css");

    expect(globals).toContain('@import "../styles/tokens.css"');
    expect(globals).toContain('@import "../styles/redesign.css"');
    expect(globals).not.toContain("legacy.css");
    expect(tokens).toContain("--color-primary: oklch(");
    expect(tokens).toContain("--radius-panel: 8px");
    expect(styles).toContain(".app-shell-header");
    expect(styles).toContain(".app-recipe-card");
    expect(styles).not.toContain("linear-gradient");
    expect(styles).not.toContain("radial-gradient");
    expect(styles).not.toContain("backdrop-filter");
  });

  it("provides desktop primary navigation and a four-destination mobile navigation", () => {
    const shell = read("src/components/app-shell.tsx");
    const styles = read("src/styles/redesign.css");

    expect(shell).toContain('t("recommend")');
    expect(shell).toContain('href={`/${locale}/fridge`}');
    expect(shell).toContain('href={`/${locale}/history`}');
    expect(shell).toContain("app-mobile-nav");
    expect(shell).toContain("app-mobile-more");
    expect(shell).toContain("LocaleSwitchLinkWithSearch");
    expect(shell).toContain("LocaleSwitchFallback");
    expect(styles).toContain("grid-template-columns: repeat(4, minmax(0, 1fr))");
  });

  it("keeps recommendation input compact and makes dish state local and accessible", () => {
    const workbench = read("src/components/recommend-workbench.tsx");
    const styles = read("src/styles/redesign.css");

    expect(workbench).toContain("app-recommend-request-strip");
    expect(workbench).toContain("app-recommend-dish-grid");
    expect(workbench).toContain("confirmingDishId");
    expect(workbench).not.toContain("setBusy");
    expect(workbench).toContain('aria-label={t("decreaseConsumption"');
    expect(workbench).toContain('aria-label={t("increaseConsumption"');
    expect(workbench).toContain("app-dish-details");
    expect(workbench).toContain('<details className="app-consumption-details"');
    expect(workbench).toContain('<summary>{t("consumptionTitle")}</summary>');
    expect(styles).toContain("grid-template-columns: minmax(280px, 320px) minmax(0, 1fr)");
  });

  it("separates initial loading from empty fridge and history states", () => {
    const fridge = read("src/components/fridge-workbench.tsx");
    const history = read("src/components/history-workbench.tsx");

    expect(fridge).toContain("const [loading, setLoading]");
    expect(fridge).toContain("app-loading-state");
    expect(fridge).toContain("app-empty-state");
    expect(history).toContain("const [loading, setLoading]");
    expect(history).toContain("app-loading-state");
    expect(history).toContain("app-empty-state");
    expect(history).toContain("app-dish-details");
  });

  it("uses explicit dirty, busy, validation, and protected delete states in settings", () => {
    const preferences = read("src/components/preferences-workbench.tsx");
    const key = read("src/components/openai-key-workbench.tsx");

    expect(preferences).toContain("setSaved(false)");
    expect(preferences).toContain('saving ? t("saving")');
    expect(key).toContain("const [saving, setSaving]");
    expect(key).toContain("const [validating, setValidating]");
    expect(key).toContain("const [deleting, setDeleting]");
    expect(key).toContain("ConfirmDeleteDialog");
    expect(key).toContain("app-key-status");
    expect(key).not.toContain("currentStatus");
  });

  it("uses Radix dialogs for auth configuration and destructive confirmation", () => {
    const provider = read("src/components/auth/auth-modal-provider.tsx");
    const confirm = read("src/components/confirm-delete-dialog.tsx");

    expect(provider).toContain('@radix-ui/react-dialog');
    expect(provider).toContain("Dialog.Content");
    expect(confirm).toContain('@radix-ui/react-dialog');
    expect(confirm).not.toContain("onEscapeKeyDown");
    expect(confirm).not.toContain("onPointerDownOutside");
    expect(confirm).toContain("Dialog.Close");
  });

  it("keeps route pages free of decorative card wrappers", () => {
    const pages = [
      "src/app/[locale]/app/page.tsx",
      "src/app/[locale]/fridge/page.tsx",
      "src/app/[locale]/preferences/page.tsx",
      "src/app/[locale]/history/page.tsx",
      "src/app/[locale]/settings/openai-key/page.tsx"
    ];

    for (const path of pages) {
      const source = read(path);
      expect(source, path).not.toContain("@/components/ui/card");
      expect(source, path).not.toContain("<Card");
    }
  });
});
