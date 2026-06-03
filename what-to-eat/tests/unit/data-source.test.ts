import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(path.join(process.cwd(), "src", "server", "data.ts"), "utf8");

function readFunction(name: string, nextName: string) {
  const start = source.indexOf(`export async function ${name}`);
  const end = source.indexOf(`export async function ${nextName}`, start);
  return source.slice(start, end);
}

describe("data source atomicity", () => {
  it("uses an upsert when adding fridge quantities so concurrent matches merge", () => {
    expect(readFunction("addFridgeItem", "updateFridgeItem")).toContain(".onConflictDoUpdate");
  });

  it("writes recommendation headers and dishes through one Neon HTTP batch transaction", () => {
    expect(readFunction("saveRecommendation", "listRecommendations")).toContain("db.batch");
  });

  it("locks every validated fridge row before applying an all-or-nothing consumption plan", () => {
    expect(readFunction("applyFridgeConsumption", "reserveGenerationCapacity")).toContain(
      "for update of fridge_items"
    );
  });

  it("merges a fridge item when an edit changes its identity to an existing row", () => {
    expect(readFunction("updateFridgeItem", "deleteFridgeItem")).toContain("matching");
    expect(readFunction("updateFridgeItem", "deleteFridgeItem")).toContain("db.batch");
  });
});
