import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  attachDishImage: vi.fn(),
  createPendingStoredImage: vi.fn(),
  deleteRecommendation: vi.fn(),
  deleteRecommendedDish: vi.fn(),
  deleteStoredImageBlobs: vi.fn(),
  ensureUser: vi.fn(),
  generateRecommendationText: vi.fn(),
  generateStoredImage: vi.fn(),
  getGenerationApiKey: vi.fn(),
  getGenerationMode: vi.fn(),
  getPreferences: vi.fn(),
  listFridgeItems: vi.fn(),
  reserveGenerationCapacity: vi.fn(),
  scheduleStoredImageCompletion: vi.fn(),
  saveRecommendation: vi.fn()
}));

vi.mock("@/server/data", () => ({
  attachDishImage: mocks.attachDishImage,
  deleteRecommendation: mocks.deleteRecommendation,
  deleteRecommendedDish: mocks.deleteRecommendedDish,
  ensureUser: mocks.ensureUser,
  getPreferences: mocks.getPreferences,
  listFridgeItems: mocks.listFridgeItems,
  reserveGenerationCapacity: mocks.reserveGenerationCapacity,
  saveRecommendation: mocks.saveRecommendation
}));

vi.mock("@/server/generation-adapter", () => ({
  generateRecommendationText: mocks.generateRecommendationText
}));

vi.mock("@/server/generation-key", () => ({
  getGenerationApiKey: mocks.getGenerationApiKey
}));

vi.mock("@/server/generation-mode", () => ({
  getGenerationMode: mocks.getGenerationMode
}));

vi.mock("@/server/images", () => ({
  createPendingStoredImage: mocks.createPendingStoredImage,
  deleteStoredImageBlobs: mocks.deleteStoredImageBlobs,
  scheduleStoredImageCompletion: mocks.scheduleStoredImageCompletion,
  generateStoredImage: mocks.generateStoredImage
}));

import {
  createRecommendation,
  removeRecommendation,
  removeRecommendedDish
} from "@/server/recommendation-service";

describe("recommendation service", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.ensureUser.mockResolvedValue({ id: "user-1" });
    mocks.reserveGenerationCapacity.mockResolvedValue(undefined);
    mocks.getGenerationMode.mockReturnValue("production_openai");
    mocks.getGenerationApiKey.mockResolvedValue("user-openai-key");
    mocks.getPreferences.mockResolvedValue({ locale: "en", preferenceText: "" });
    mocks.listFridgeItems.mockResolvedValue([
      {
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "Tomato",
        quantity: 2,
        unit: "pieces",
        version: 1
      }
    ]);
    mocks.createPendingStoredImage.mockImplementation(async (input) => {
      const imageId =
        mocks.createPendingStoredImage.mock.calls.length === 1 ? "image-first" : "image-second";
      await input.attach(imageId);
      return {
        id: imageId,
        status: "pending",
        publicUrl: null,
        deadlineAt: "2026-06-06T00:04:30.000Z"
      };
    });
    mocks.generateStoredImage.mockResolvedValue({ id: "legacy-image", status: "succeeded" });
    mocks.deleteRecommendation.mockResolvedValue({ blobPathnames: [] });
    mocks.deleteRecommendedDish.mockResolvedValue({ blobPathnames: [], remainingCount: 0 });
    mocks.deleteStoredImageBlobs.mockResolvedValue(undefined);
  });

  it("matches generated dishes to persisted positions while scheduling non-blocking image tasks", async () => {
    mocks.generateRecommendationText.mockResolvedValue({
      dishes: [
        {
          name: "First dish",
          summary: "Use the first persisted position.",
          instructions: ["Cook first."],
          estimatedMinutes: 10,
          consumptions: []
        },
        {
          name: "Second dish",
          summary: "Use the second persisted position.",
          instructions: ["Cook second."],
          estimatedMinutes: 12,
          consumptions: []
        }
      ]
    });
    mocks.saveRecommendation.mockResolvedValue({
      recommendation: { id: "recommendation-1" },
      dishes: [
        {
          id: "persisted-second",
          position: 2,
          name: "Second dish",
          summary: "Use the second persisted position.",
          instructionsJson: ["Cook second."],
          estimatedMinutes: 12
        },
        {
          id: "persisted-first",
          position: 1,
          name: "First dish",
          summary: "Use the first persisted position.",
          instructionsJson: ["Cook first."],
          estimatedMinutes: 10
        }
      ]
    });

    const result = await createRecommendation("clerk-user-1", {
      candidateCount: 2,
      temporaryRequirement: ""
    });

    expect(result.dishes.map((dish) => dish.id)).toEqual(["persisted-first", "persisted-second"]);
    expect(mocks.attachDishImage.mock.calls.map(([dishId]) => dishId)).toEqual([
      "persisted-first",
      "persisted-second"
    ]);
    expect(result.dishes.map((dish) => dish.image.status)).toEqual(["pending", "pending"]);
    expect(result.dishes.map((dish) => dish.image.deadlineAt)).toEqual([
      "2026-06-06T00:04:30.000Z",
      "2026-06-06T00:04:30.000Z"
    ]);
    expect(mocks.scheduleStoredImageCompletion).toHaveBeenCalledTimes(2);
    expect(mocks.generateStoredImage).not.toHaveBeenCalled();
  });

  it("deletes a whole recommendation and cleans up its dish image blobs", async () => {
    mocks.deleteRecommendation.mockResolvedValue({
      blobPathnames: ["generated/dish/image-1.png", "generated/dish/image-2.png"]
    });

    await removeRecommendation("clerk-user-1", "recommendation-1");

    expect(mocks.deleteRecommendation).toHaveBeenCalledWith("user-1", "recommendation-1");
    expect(mocks.deleteStoredImageBlobs).toHaveBeenCalledWith([
      "generated/dish/image-1.png",
      "generated/dish/image-2.png"
    ]);
  });

  it("deletes one historical dish and cleans up its current dish image blob", async () => {
    mocks.deleteRecommendedDish.mockResolvedValue({
      blobPathnames: ["generated/dish/image-1.png"],
      remainingCount: 1
    });

    await removeRecommendedDish("clerk-user-1", "dish-1");

    expect(mocks.deleteRecommendedDish).toHaveBeenCalledWith("user-1", "dish-1");
    expect(mocks.deleteStoredImageBlobs).toHaveBeenCalledWith(["generated/dish/image-1.png"]);
  });
});
