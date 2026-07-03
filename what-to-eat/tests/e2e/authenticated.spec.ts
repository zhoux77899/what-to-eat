import { expect, type Route, test } from "@playwright/test";

const authStatePath = process.env.E2E_CLERK_STORAGE_STATE;

test.use(authStatePath ? { storageState: authStatePath } : {});

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({
    body: JSON.stringify(body),
    contentType: "application/json",
    status: 200
  });
}

test.describe("authenticated workbench flows", () => {
  test.skip(
    !authStatePath,
    "Set E2E_CLERK_STORAGE_STATE to a Playwright storage state from a Clerk test user."
  );

  test("edits a fridge item and restores focus to its inventory row", async ({ page }) => {
    const item = {
      id: "fridge-item-1",
      name: "Tomato",
      quantity: 2,
      unit: "kg",
      version: 1,
      imageStatus: "succeeded",
      imageUrl: null,
      imageErrorCode: null,
      imageDeadlineAt: null
    };

    await page.route("**/api/fridge-items", (route) => fulfillJson(route, { items: [item] }));
    await page.route("**/api/fridge-items/fridge-item-1", (route) =>
      fulfillJson(route, { item })
    );

    await page.goto("/en/fridge");
    await page.getByRole("button", { name: "Edit" }).click();
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByRole("article")).toBeFocused();
  });

  test("generates a dish and confirms disclosed consumption", async ({ page }) => {
    await page.route("**/api/recommend", (route) =>
      fulfillJson(route, {
        dishes: [
          {
            id: "dish-1",
            name: "Tomato rice",
            summary: "A quick pantry dinner.",
            instructions: ["Cook the rice", "Fold in the tomato"],
            estimatedMinutes: 20,
            consumptions: [
              {
                fridgeItemId: "fridge-item-1",
                fridgeItemName: "Tomato",
                expectedVersion: 1,
                consumedQuantity: 1,
                unit: "kg"
              }
            ],
            image: {
              status: "succeeded",
              publicUrl: null,
              deadlineAt: null
            }
          }
        ]
      })
    );
    await page.route("**/api/fridge-items/apply-consumption", (route) =>
      fulfillJson(route, { ok: true })
    );

    await page.goto("/en/app");
    await page.getByRole("button", { name: "Increase candidate count" }).click();
    await expect(page.locator(".app-candidate-count-value")).toHaveText("4");
    await page.getByRole("button", { name: "Decrease candidate count" }).click();
    await expect(page.locator(".app-candidate-count-value")).toHaveText("3");
    await page.locator(".app-generate-button").click();
    await page.getByText("Suggested consumption", { exact: true }).click();
    await page.getByRole("button", { name: "Confirm consumption" }).click();
    await expect(page.getByRole("dialog", { name: "Confirm fridge consumption" })).toBeVisible();
    await page.getByRole("button", { name: "Deduct ingredients" }).click();

    await expect(page.getByText("Consumption confirmed")).toBeVisible();
  });

  test("shows history image recovery and protected deletion", async ({ page }) => {
    let retryCount = 0;
    const recommendations = {
      recommendations: [
        {
          id: "recommendation-1",
          locale: "en",
          createdAt: "2026-06-20T12:00:00.000Z",
          dishes: [
            {
              id: "dish-1",
              name: "Tomato rice",
              summary: "A quick pantry dinner.",
              instructions: ["Cook the rice"],
              estimatedMinutes: 20,
              imageStatus: "failed",
              imageUrl: null,
              imageDeadlineAt: null
            }
          ]
        }
      ]
    };

    await page.route("**/api/recommendations", (route) => fulfillJson(route, recommendations));
    await page.route("**/api/recommendations/dish-1/retry-image", async (route) => {
      retryCount += 1;
      await fulfillJson(route, { ok: true });
    });

    await page.goto("/en/history");
    await page.locator(".app-history-entry-summary").click();
    await page.getByRole("button", { name: "Retry image" }).click();
    await expect.poll(() => retryCount).toBe(1);
    await page.getByRole("button", { name: "Delete dish" }).click();

    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("persists preference edits and protects API key deletion", async ({ page }) => {
    await page.route("**/api/preferences", async (route) => {
      if (route.request().method() === "GET") {
        await fulfillJson(route, { preferences: { preferenceText: "No cilantro" } });
        return;
      }
      await fulfillJson(route, { preferences: { preferenceText: "No cilantro or peanuts" } });
    });

    await page.goto("/en/preferences");
    await page.getByRole("textbox").fill("No cilantro or peanuts");
    await page.getByRole("button", { name: "Save preferences" }).click();
    await expect(page.getByText("Preferences saved.")).toBeVisible();

    await page.route("**/api/openai-key", async (route) => {
      if (route.request().method() === "DELETE") {
        await fulfillJson(route, { key: null, status: "not_configured" });
        return;
      }
      await fulfillJson(route, {
        key: { hint: "sk-...1234", status: "valid" },
        status: "valid"
      });
    });

    await page.goto("/en/settings/openai-key");
    await page.getByRole("button", { name: "Delete key" }).click();
    await expect(page.getByRole("dialog", { name: "Delete API key" })).toBeVisible();
  });
});
