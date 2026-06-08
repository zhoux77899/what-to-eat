import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  addFridgeItem: vi.fn(),
  applyFridgeConsumption: vi.fn(),
  attachFridgeItemImage: vi.fn(),
  createPendingStoredImage: vi.fn(),
  deleteFridgeItem: vi.fn(),
  ensureUser: vi.fn(),
  generateStoredImage: vi.fn(),
  getFridgeItem: vi.fn(),
  getGenerationApiKey: vi.fn(),
  getGenerationMode: vi.fn(),
  listFridgeItems: vi.fn(),
  reserveGenerationCapacity: vi.fn(),
  scheduleStoredImageCompletion: vi.fn(),
  updateFridgeItem: vi.fn()
}));

vi.mock("@/server/data", () => ({
  addFridgeItem: mocks.addFridgeItem,
  applyFridgeConsumption: mocks.applyFridgeConsumption,
  attachFridgeItemImage: mocks.attachFridgeItemImage,
  deleteFridgeItem: mocks.deleteFridgeItem,
  ensureUser: mocks.ensureUser,
  getFridgeItem: mocks.getFridgeItem,
  listFridgeItems: mocks.listFridgeItems,
  reserveGenerationCapacity: mocks.reserveGenerationCapacity,
  updateFridgeItem: mocks.updateFridgeItem
}));

vi.mock("@/server/generation-key", () => ({
  getGenerationApiKey: mocks.getGenerationApiKey
}));

vi.mock("@/server/generation-mode", () => ({
  getGenerationMode: mocks.getGenerationMode
}));

vi.mock("@/server/images", () => ({
  createPendingStoredImage: mocks.createPendingStoredImage,
  scheduleStoredImageCompletion: mocks.scheduleStoredImageCompletion,
  generateStoredImage: mocks.generateStoredImage
}));

import { createFridgeItem, editFridgeItem } from "@/server/fridge-service";

describe("fridge service image scheduling", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.ensureUser.mockResolvedValue({ id: "user-1" });
    mocks.getGenerationMode.mockReturnValue("production_openai");
    mocks.reserveGenerationCapacity.mockResolvedValue(undefined);
    mocks.getGenerationApiKey.mockResolvedValue("user-openai-key");
    mocks.createPendingStoredImage.mockImplementation(async (input) => {
      await input.attach("image-pending-1");
      return {
        id: "image-pending-1",
        status: "pending",
        publicUrl: null,
        deadlineAt: "2026-06-06T00:04:30.000Z"
      };
    });
    mocks.generateStoredImage.mockResolvedValue({ id: "legacy-image", status: "succeeded" });
  });

  it("adds an ingredient immediately and schedules its image instead of waiting for generation", async () => {
    mocks.addFridgeItem.mockResolvedValue({
      item: {
        id: "fridge-1",
        name: "Tomato",
        quantity: 2,
        unit: "pieces",
        version: 1
      },
      shouldGenerateImage: true
    });

    const item = await createFridgeItem("clerk-user-1", {
      name: "Tomato",
      quantity: 2,
      unit: "pieces"
    });

    expect(item.id).toBe("fridge-1");
    expect(mocks.createPendingStoredImage).toHaveBeenCalledTimes(1);
    expect(mocks.attachFridgeItemImage).toHaveBeenCalledWith(
      "user-1",
      "fridge-1",
      "image-pending-1"
    );
    expect(mocks.scheduleStoredImageCompletion).toHaveBeenCalledTimes(1);
    expect(mocks.generateStoredImage).not.toHaveBeenCalled();
  });

  it("does not schedule a new image when editing only quantity or unit", async () => {
    mocks.updateFridgeItem.mockResolvedValue({
      item: {
        id: "fridge-1",
        name: "Tomato",
        quantity: 3,
        unit: "pieces",
        version: 2
      },
      shouldGenerateImage: false
    });

    await editFridgeItem("clerk-user-1", "fridge-1", {
      quantity: 3,
      unit: "pieces"
    });

    expect(mocks.createPendingStoredImage).not.toHaveBeenCalled();
    expect(mocks.scheduleStoredImageCompletion).not.toHaveBeenCalled();
    expect(mocks.generateStoredImage).not.toHaveBeenCalled();
  });
});
