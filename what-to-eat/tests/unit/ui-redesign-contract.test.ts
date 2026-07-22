import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("full-site UI redesign contract", () => {
  it("uses layered redesign styles with OKLCH semantic tokens", () => {
    const globals = read("src/app/globals.css");
    const tokens = read("src/styles/tokens.css");

    expect(globals).toContain('@import "../styles/tokens.css"');
    expect(globals).toContain('@import "../styles/redesign.css"');
    expect(globals).toContain('@import "../styles/button-skins.generated.css"');
    expect(tokens).toContain("oklch(");
    expect(tokens).toContain("--color-primary");
    expect(tokens).toContain("--color-danger");
  });

  it("provides responsive four-item mobile navigation and route-preserving locale links", () => {
    const shell = read("src/components/app-shell.tsx");

    expect(shell).toContain("app-mobile-nav");
    expect(shell).toContain('t("recommend")');
    expect(shell).toContain('t("history")');
    expect(shell).toContain("LocaleSwitchLinkWithSearch");
    expect(shell).toContain("useSearchParams");
  });

  it("keeps shared controls horizontal and overlay menus out of document flow", () => {
    const styles = read("src/styles/redesign.css");

    expect(styles).toMatch(
      /\.home-paper-button[\s\S]*?display:\s*inline-flex[\s\S]*?white-space:\s*nowrap/
    );
    expect(styles).toMatch(/\.app-shell-menu\s*\{[^}]*position:\s*relative/s);
    expect(styles).toMatch(
      /\.app-menu-panel\s*\{[^}]*display:\s*grid[^}]*position:\s*absolute/s
    );
    expect(styles).toMatch(/\.app-menu-link\s*\{[^}]*display:\s*flex/s);
    expect(styles).toMatch(/\.app-form-field\s*\{[^}]*display:\s*grid/s);
    expect(styles).toMatch(/\.app-action-row\s*\{[^}]*display:\s*flex/s);
  });

  it("exposes accessible consumption controls and explicit initial loading states", () => {
    const recommend = read("src/components/recommend-workbench.tsx");
    const fridge = read("src/components/fridge-workbench.tsx");
    const history = read("src/components/history-workbench.tsx");

    expect(recommend).toContain('aria-label={t("decreaseConsumption"');
    expect(recommend).toContain('aria-label={t("increaseConsumption"');
    expect(fridge).toContain('t("loading")');
    expect(history).toContain('t("loading")');
  });

  it("uses Radix for the configuration modal as well as authentication", () => {
    const provider = read("src/components/auth/auth-modal-provider.tsx");

    expect(provider).toContain('@radix-ui/react-dialog');
    expect(provider).toContain("Dialog.Content");
  });

  it("keeps mutations local and follows the approved desktop column order", () => {
    const recommend = read("src/components/recommend-workbench.tsx");
    const fridge = read("src/components/fridge-workbench.tsx");
    const history = read("src/components/history-workbench.tsx");
    const key = read("src/components/openai-key-workbench.tsx");
    const styles = read("src/styles/redesign.css");

    expect(recommend).toContain("retryingDishIds");
    expect(recommend).toContain("confirmingDishIds");
    expect(recommend).toContain("app-recommend-skeleton");
    expect(fridge).toContain("deletingItemIds");
    expect(fridge).toContain("retryingItemIds");
    expect(fridge).not.toContain("setPendingDelete(null);\n    await remove");
    expect(history).toContain("deletingRowIds");
    expect(history).toContain("retryingRowIds");
    expect(key).toContain("const [saving, setSaving]");
    expect(key).toContain("const [validating, setValidating]");
    expect(key).toContain("const [deleting, setDeleting]");
    expect(styles).toContain("grid-template-columns: minmax(280px, 320px) minmax(0, 1fr)");
    expect(styles).toContain("@media (max-width: 1023px)");
  });

  it("places recommendation controls in a full-width right-side stepper card", () => {
    const recommend = read("src/components/recommend-workbench.tsx");
    const styles = read("src/styles/redesign.css");

    expect(recommend).toContain('aria-label={t("decreaseCandidateCount")}');
    expect(recommend).toContain('aria-label={t("increaseCandidateCount")}');
    expect(recommend).not.toContain("<select");
    expect(styles).toMatch(/\.app-recommend-request-strip\s*\{[^}]*grid-column:\s*2/s);
    expect(styles).toMatch(/\.app-recommend-results[^}]*grid-column:\s*1/s);
    expect(styles).toMatch(/\.app-candidate-count-stepper\s*\{[^}]*width:\s*100%/s);
  });

  it("keeps history lightweight and mobile controls touch safe", () => {
    const history = read("src/components/history-workbench.tsx");
    const styles = read("src/styles/redesign.css");

    expect(history).toContain("app-history-timeline");
    expect(history).toContain("app-history-dish-row");
    expect(history).toContain('href={`/${locale}/app`}');
    expect(styles).toContain(".app-fridge-workspace {");
    expect(styles).toContain(".app-history-dish-row");
    expect(styles).not.toContain("min-height: 38px");
    expect(styles).toContain(".app-confirm-dialog-actions");
    expect(styles).toContain("flex-direction: column-reverse");
  });

  it("keeps concurrent errors adjacent and protects history children during parent deletion", () => {
    const recommend = read("src/components/recommend-workbench.tsx");
    const fridge = read("src/components/fridge-workbench.tsx");
    const history = read("src/components/history-workbench.tsx");
    const styles = read("src/styles/redesign.css");

    expect(recommend).toContain("dishErrors");
    expect(fridge).toContain("itemErrors");
    expect(history).toContain("rowErrors");
    expect(history).toContain("recommendationDeleting");
    expect(styles).toContain(".auth-modal-close,");
    expect(styles).toContain(".app-menu-link {");
    expect(styles).toContain("min-height: 44px");
  });

  it("avoids one-sided accent borders used as decorative timeline tabs", () => {
    const styles = read("src/styles/redesign.css");

    expect(styles).not.toMatch(/border-(left|right):\s*(?:[3-9]|\d{2,})px/);
  });

  it("uses raster provider artwork and the shared tileable account surface", () => {
    const auth = read("src/components/auth/auth-modal.tsx");
    const shell = read("src/components/app-shell.tsx");
    const globals = read("src/app/globals.css");

    expect(auth).toContain("GoogleStickerIcon");
    expect(auth).toContain("GitHubStickerIcon");
    expect(auth).toContain('src="/ui/providers/google.webp"');
    expect(auth).toContain('src="/ui/providers/github.webp"');
    expect(auth).not.toContain("<svg");
    expect(shell).not.toContain('className="app-menu-account"');
    expect(shell).toContain('className="app-mobile-account"');
    expect(shell).toContain('className="app-button-surface app-user-button"');
    expect(shell).toContain('<ButtonSkin tone="secondary" />');
    expect(auth).toContain('size="provider"');
    expect(globals).toContain("height: 64px");
    expect(globals).toContain("grid-template-columns: 40px minmax(0, 1fr) 40px");
    expect(globals).not.toContain("aspect-ratio: 10 / 3");
    expect(globals).not.toContain("border-image");
  });

  it("assembles minimal repeated button slices without full-frame runtime scaling", () => {
    const globals = read("src/app/globals.css");
    const generated = read("src/styles/button-skins.generated.css");
    const button = read("src/components/ui/button.tsx");
    const skin = read("src/components/ui/button-skin.tsx");
    const generator = read("scripts/generate-button-slices.mjs");
    const skinRule = globals.match(/\.app-button-skin \{[\s\S]*?\n\}/)?.[0] ?? "";

    expect(button).toContain("Slottable");
    expect(button).toContain('danger: "app-button-tone-danger"');
    expect(skin).toContain("buttonSkinSlices");
    expect(skin).toContain('data-slice={slice}');
    expect(globals).toContain("background-repeat: repeat");
    expect(globals).toContain("background-size: 1px 1px");
    expect(globals).toContain("background-repeat: repeat-x");
    expect(globals).toContain("background-repeat: repeat-y");
    expect(globals).toContain("width: calc(100% + 2px)");
    expect(globals).not.toContain("background-size: 100% 100%");
    expect(globals).not.toContain("grid-template-rows: 30fr 48fr 30fr");
    expect(generator).toContain("repeatSample = { x: 179, y: 53, size: 2 }");
    expect(generator).toContain('assetRecord(rect, name, "repeat-x")');
    expect(generator).toContain('assetRecord(rect, name, "repeat-y")');
    expect(generated).toContain("/ui/buttons/slices/primary/default/top-left.webp");
    expect(generated).toContain("/ui/buttons/slices/danger/pressed/bottom-right.webp");
    expect(generated).not.toMatch(/\/ui\/buttons\/(primary|secondary|danger)-(default|hover|pressed)\.webp/);
    expect(generated).toContain("--app-button-skin-top-offset");
    expect(skinRule).toContain("border-radius: 5px");
    expect(skinRule).toContain("overflow: hidden");
    expect(globals).not.toContain("aspect-ratio");
  });

  it("makes recommendation history collapsible and prevents preference writes after load failure", () => {
    const history = read("src/components/history-workbench.tsx");
    const preferences = read("src/components/preferences-workbench.tsx");

    expect(history).toContain('<details className="app-history-entry"');
    expect(history).toContain('<summary className="app-history-entry-summary"');
    expect(preferences).toContain("loadFailed");
    expect(preferences).toContain("loading || loadFailed || saving");
  });

  it("routes shared Tailwind colors through OKLCH semantic tokens", () => {
    const config = read("tailwind.config.ts");
    const tokens = read("src/styles/tokens.css");
    const styles = read("src/styles/redesign.css");

    expect(config).not.toContain("hsl(var(");
    expect(config).toContain('primary: "var(--color-primary)"');
    expect(tokens).not.toMatch(/^\s*--background:/m);
    expect(styles).not.toContain("font-size: clamp(");
  });

  it("keeps action contrast and Home color semantics release safe", () => {
    const tokens = read("src/styles/tokens.css");
    const styles = read("src/styles/redesign.css");

    expect(tokens).toContain("--color-primary: oklch(50%");
    expect(tokens).toContain("--color-danger: oklch(52%");
    expect(styles).toMatch(/\.home-hero-cta\s*\{[^}]*background:\s*var\(--color-primary\)/s);
    expect(styles).toMatch(/\.home-hero-logo-card\s*\{[^}]*border:\s*0/s);
  });

  it("keeps dialogs dismissible and navigation state programmatic", () => {
    const auth = read("src/components/auth/auth-modal.tsx");
    const confirm = read("src/components/confirm-delete-dialog.tsx");
    const shell = read("src/components/app-shell.tsx");

    expect(auth).not.toContain("onEscapeKeyDown");
    expect(auth).not.toContain("onPointerDownOutside");
    expect(confirm).not.toContain("onEscapeKeyDown");
    expect(confirm).not.toContain("onPointerDownOutside");
    expect(confirm).toContain("onCloseAutoFocus");
    expect(shell).toContain('aria-current={isCurrentPath(');
    expect(shell).toContain("isMorePath");
    expect(shell).toContain("LocaleSwitchFallback");
  });

  it("protects destructive consumption and cross-operation races", () => {
    const recommend = read("src/components/recommend-workbench.tsx");
    const fridge = read("src/components/fridge-workbench.tsx");

    expect(recommend).toContain("pendingConsumptionDish");
    expect(recommend).toContain("recommendInteractionBusy");
    expect(recommend).toContain("ConfirmDeleteDialog");
    expect(fridge).toContain("loadFailed");
    expect(fridge).toContain("nameInputRef");
    expect(fridge).toContain("editingItemBusy");
    expect(fridge).toContain("editingId === itemId");
    expect(fridge).toContain("savingItemIdRef");
  });

  it("announces async failures and restores focus after protected actions", () => {
    const recommend = read("src/components/recommend-workbench.tsx");
    const history = read("src/components/history-workbench.tsx");
    const key = read("src/components/openai-key-workbench.tsx");

    expect(recommend).toContain('restoreFocusId="recommend-page-title"');
    expect(history).toContain('restoreFocusId="history-page-title"');
    expect(key).toContain('restoreFocusId="openai-key-page-title"');
    expect(recommend).toContain('role="alert"');
    expect(history).toContain('role="alert"');
    expect(key).toContain('role="alert"');
  });
});
