import { expect, test } from "@playwright/test";

test("renders Chinese and English locale home pages", async ({ page }) => {
  await page.goto("/zh");
  await expect(page.getByRole("heading", { name: "今天吃什么" })).toBeVisible();

  await page.goto("/en");
  await expect(page.getByRole("heading", { name: "What to eat today" })).toBeVisible();
});

test("opens the sign-in modal from a protected home action", async ({ page }) => {
  await page.goto("/zh");
  await page.getByRole("link", { name: "开始推荐" }).click();

  await expect(page.getByRole("dialog", { name: "登录" })).toBeVisible();
  await expect(page.getByRole("button", { name: "使用 Google 登录" })).toBeVisible();
  await expect(page.getByRole("button", { name: "使用 GitHub 登录" })).toBeVisible();
});

test("keeps protected app areas behind authentication", async ({ page }) => {
  await page.goto("/zh/app");

  await expect(page).toHaveURL(/\/zh\?signIn=1&returnTo=%2Fzh%2Fapp/);
  await expect(page.getByRole("dialog", { name: "登录" })).toBeVisible();
});

test("keeps OpenAI key settings behind authentication", async ({ page }) => {
  await page.goto("/zh/settings/openai-key");

  await expect(page).toHaveURL(/\/zh\?signIn=1&returnTo=%2Fzh%2Fsettings%2Fopenai-key/);
  await expect(page.getByRole("dialog", { name: "登录" })).toBeVisible();
});
