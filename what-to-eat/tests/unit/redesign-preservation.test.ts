import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function readProjectFile(path: string) {
  return readFileSync(join(projectRoot, path), "utf8");
}

function readJsonFile<T>(path: string): T {
  return JSON.parse(readProjectFile(path)) as T;
}

function collectFiles(dir: string, extensions: string[]) {
  const root = join(projectRoot, dir);
  const files: string[] = [];

  function walk(current: string) {
    for (const entry of readdirSync(current)) {
      const next = join(current, entry);
      const stat = statSync(next);

      if (stat.isDirectory()) {
        walk(next);
        continue;
      }

      if (extensions.some((extension) => next.endsWith(extension))) {
        files.push(next);
      }
    }
  }

  if (existsSync(root)) {
    walk(root);
  }

  return files;
}

describe("redesign preservation and pre-flight", () => {
  it("keeps the approved route tree and primary navigation destinations stable", () => {
    const routeFiles = [
      "src/app/page.tsx",
      "src/app/[locale]/page.tsx",
      "src/app/[locale]/app/page.tsx",
      "src/app/[locale]/fridge/page.tsx",
      "src/app/[locale]/preferences/page.tsx",
      "src/app/[locale]/history/page.tsx",
      "src/app/[locale]/settings/openai-key/page.tsx",
      "src/app/[locale]/sso-callback/page.tsx"
    ];
    const appShellSource = readProjectFile("src/components/app-shell.tsx");

    for (const routeFile of routeFiles) {
      expect(existsSync(join(projectRoot, routeFile)), routeFile).toBe(true);
    }

    expect(readProjectFile("src/app/page.tsx")).toContain("redirect(`/${routing.defaultLocale}`)");
    expect(appShellSource).toContain('href={`/${locale}`}');
    expect(appShellSource).toContain('href={`/${locale}/app`}');
    expect(appShellSource).toContain('href={`/${locale}/fridge`}');
    expect(appShellSource).toContain('href={`/${locale}/preferences`}');
    expect(appShellSource).toContain('href={`/${locale}/history`}');
    expect(appShellSource).toContain('href={`/${locale}/settings/openai-key`}');
    expect(appShellSource).toContain('href={`/${alternateLocale}`}');
  });

  it("keeps navigation labels in i18n resources unchanged", () => {
    const zh = readJsonFile<{ navigation: Record<string, string> }>("messages/zh.json");
    const en = readJsonFile<{ navigation: Record<string, string> }>("messages/en.json");

    expect(zh.navigation).toMatchObject({
      brand: "今天吃什么",
      menu: "菜单",
      fridge: "冰箱",
      preferences: "饮食偏好",
      history: "推荐历史",
      openAiKey: "OpenAI 密钥",
      language: "English",
      signIn: "登录",
      more: "更多"
    });
    expect(en.navigation).toMatchObject({
      brand: "What to eat",
      menu: "Menu",
      fridge: "Fridge",
      preferences: "Food preferences",
      history: "History",
      openAiKey: "OpenAI key",
      language: "中文",
      signIn: "Sign in",
      more: "More"
    });
  });

  it("preserves form payload fields and protected anchors", () => {
    const recommendSource = readProjectFile("src/components/recommend-workbench.tsx");
    const fridgeSource = readProjectFile("src/components/fridge-workbench.tsx");
    const openAiKeySource = readProjectFile("src/components/openai-key-workbench.tsx");
    const preferencesSource = readProjectFile("src/components/preferences-workbench.tsx");
    const appPageSource = readProjectFile("src/app/[locale]/app/page.tsx");
    const ssoSource = readProjectFile("src/app/[locale]/sso-callback/page.tsx");
    const authModalSource = readProjectFile("src/components/auth/auth-modal-provider.tsx");

    expect(recommendSource).toContain("candidateCount: Number(candidateCount)");
    expect(recommendSource).toContain("temporaryRequirement: temporaryRequirement.trim() || null");
    expect(recommendSource).toContain("body: JSON.stringify({ consumptions: dish.consumptions })");
    expect(fridgeSource).toContain("name: form.name");
    expect(fridgeSource).toContain("quantity: Number(form.quantity)");
    expect(fridgeSource).toContain("unit: form.unit");
    expect(openAiKeySource).toContain('name="apiKey"');
    expect(openAiKeySource).toContain("body: JSON.stringify({ apiKey })");
    expect(preferencesSource).toContain("body: JSON.stringify({ locale, preferenceText })");
    expect(appPageSource).toContain('id="recommend-page-title"');
    expect(authModalSource).toContain('id="auth-modal-title"');
    expect(ssoSource).toContain('id="clerk-captcha"');
  });

  it("keeps brand image treatment and kitchen accent tokens", () => {
    const brandSource = readProjectFile("src/components/brand-assets.tsx");
    const homeSource = readProjectFile("src/app/[locale]/page.tsx");
    const globalCss = readProjectFile("src/app/globals.css");

    expect(brandSource).toContain("/brand/header-logo-zh.webp");
    expect(brandSource).toContain("/brand/header-logo-en.webp");
    expect(brandSource).toContain("/brand/app-icon-512.png");
    expect(homeSource).toContain("BrandLogoImage");
    expect(globalCss).toContain("--accent: 24 82% 54%");
    expect(globalCss).toContain("--kitchen-green: #80934a");
    expect(globalCss).toContain("--kitchen-tomato: #e45e45");
    expect(globalCss).toContain("--kitchen-yolk: #efb947");
    expect(globalCss).toContain("--panel-radius: 0.875rem");
    expect(globalCss).toContain("--control-radius: 0.625rem");
    expect(globalCss).toContain("--sticker-radius: 0.375rem");
  });

  it("passes static pre-flight checks for the redesign source", () => {
    const source = [
      ...collectFiles("src", [".ts", ".tsx", ".css"]),
      ...collectFiles("messages", [".json"])
    ]
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");

    expect(source).not.toContain("—");
    expect(source).not.toContain("backdrop-filter");
    expect(source).not.toContain("bg-clip-text");
    expect(source).not.toContain("text-transparent");
    expect(source).not.toContain('href="#"');
    expect(source).not.toContain("Acme");
    expect(source).not.toContain("Jane Doe");
    expect(source).not.toContain("min-h-screen");
    expect(source).not.toContain("h-screen");
  });

  it("keeps user-facing copy in i18n resources instead of page source", () => {
    const sourceFiles = collectFiles("src", [".ts", ".tsx"]).filter(
      (file) => !file.endsWith("brand-assets.tsx")
    );

    for (const file of sourceFiles) {
      const source = readFileSync(file, "utf8");

      expect(source, file).not.toMatch(/[\u3400-\u9fff\u3040-\u30ff]/);
    }
  });
});
