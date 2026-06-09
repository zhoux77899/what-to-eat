import { describe, expect, it } from "vitest";

import {
  CHROMA_KEY_COLOR,
  buildDishImagePrompt,
  buildIngredientImagePrompt
} from "@/server/image-prompts";

describe("comic image prompts", () => {
  it("uses the configured manga cutout style for ingredient images", () => {
    const prompt = buildIngredientImagePrompt("tomato");

    expect(prompt).toContain("Create a standalone ingredient illustration: tomato");
    expect(prompt).toContain("cozy kawaii Japanese comic food illustration style");
    expect(prompt).toContain("clear dark chocolate-brown ink outlines");
    expect(prompt).toContain("Perfectly flat solid #ff00ff chroma-key background");
    expect(prompt).toContain("Use the literal pure RGB color #FF00FF only for the background");
    expect(prompt).toContain("512x512 px square canvas");
    expect(prompt).toContain("No text, no label");
    expect(prompt).toContain(`Do not use ${CHROMA_KEY_COLOR} anywhere in the subject.`);
  });

  it("derives dish image prompts from the same comic cutout style", () => {
    const prompt = buildDishImagePrompt(
      "Tomato scrambled eggs",
      "A quick home-style dish with soft eggs and tomatoes."
    );

    expect(prompt).toContain("Create a standalone finished dish illustration: Tomato scrambled eggs");
    expect(prompt).toContain("A quick home-style dish with soft eggs and tomatoes.");
    expect(prompt).toContain("cozy kawaii Japanese comic food illustration style");
    expect(prompt).toContain("Perfectly flat solid #ff00ff chroma-key background");
    expect(prompt).toContain("Use the literal pure RGB color #FF00FF only for the background");
    expect(prompt).toContain("One centered finished dish only");
    expect(prompt).toContain("No text, no label");
  });
});
