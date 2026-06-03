export type FridgeItemInput = {
  name: string;
  quantity: number;
  unit: string;
};

export type FridgeItemState = FridgeItemInput & {
  id: string;
  normalizedName: string;
  normalizedUnit: string;
  version: number;
};

export type FridgeConsumptionInput = {
  fridgeItemId: string;
  expectedVersion: number;
  consumedQuantity: number;
  unit: string;
};

export type FridgeConsumptionOperation =
  | {
      fridgeItemId: string;
      action: "update";
      nextQuantity: number;
      nextVersion: number;
    }
  | {
      fridgeItemId: string;
      action: "delete";
    };

export class FridgeConsumptionConflictError extends Error {
  constructor(message = "Fridge inventory changed before consumption could be applied") {
    super(message);
    this.name = "FridgeConsumptionConflictError";
  }
}

const FRIDGE_QUANTITY_SCALE = 3;

function normalizeIdentityPart(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

function roundFridgeQuantity(value: number) {
  return Number(value.toFixed(FRIDGE_QUANTITY_SCALE));
}

export function normalizeFridgeItemIdentity(name: string, unit: string) {
  return {
    normalizedName: normalizeIdentityPart(name),
    normalizedUnit: normalizeIdentityPart(unit)
  };
}

export function mergeFridgeItemQuantity(current: FridgeItemState, addition: FridgeItemInput) {
  const identity = normalizeFridgeItemIdentity(addition.name, addition.unit);

  if (
    current.normalizedName !== identity.normalizedName ||
    current.normalizedUnit !== identity.normalizedUnit
  ) {
    throw new Error("Only matching fridge items can be merged");
  }

  return {
    ...current,
    quantity: current.quantity + addition.quantity,
    version: current.version + 1
  };
}

export function shouldRegenerateFridgeItemImage(previousName: string, nextName: string) {
  return normalizeIdentityPart(previousName) !== normalizeIdentityPart(nextName);
}

export function planFridgeConsumption(
  items: readonly FridgeItemState[],
  consumptions: readonly FridgeConsumptionInput[]
) {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const consumedItemIds = new Set<string>();

  return consumptions.map((consumption): FridgeConsumptionOperation => {
    if (consumedItemIds.has(consumption.fridgeItemId)) {
      throw new FridgeConsumptionConflictError("A fridge item cannot be consumed twice");
    }
    consumedItemIds.add(consumption.fridgeItemId);

    const item = itemsById.get(consumption.fridgeItemId);
    const normalizedUnit = normalizeIdentityPart(consumption.unit);
    const itemQuantity = item ? roundFridgeQuantity(item.quantity) : 0;
    const consumedQuantity = roundFridgeQuantity(consumption.consumedQuantity);

    if (
      !item ||
      item.version !== consumption.expectedVersion ||
      item.normalizedUnit !== normalizedUnit ||
      consumedQuantity <= 0 ||
      consumedQuantity > itemQuantity
    ) {
      throw new FridgeConsumptionConflictError();
    }

    const nextQuantity = roundFridgeQuantity(itemQuantity - consumedQuantity);

    return nextQuantity === 0
      ? {
          fridgeItemId: item.id,
          action: "delete"
        }
      : {
          fridgeItemId: item.id,
          action: "update",
          nextQuantity,
          nextVersion: item.version + 1
        };
  });
}
