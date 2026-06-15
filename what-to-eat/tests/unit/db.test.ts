import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const neonMock = vi.hoisted(() =>
  vi.fn((databaseUrl: string) => ({
    databaseUrl
  }))
);

const drizzleMock = vi.hoisted(() =>
  vi.fn((client: { databaseUrl: string }, config: unknown) => ({
    client,
    config,
    instanceId: Symbol(client.databaseUrl)
  }))
);

vi.mock("@neondatabase/serverless", () => ({
  neon: neonMock
}));

vi.mock("drizzle-orm/neon-http", () => ({
  drizzle: drizzleMock
}));

type DbGlobal = typeof globalThis & {
  __whatToEatDefaultDb?: unknown;
};

describe("createDb", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    vi.resetModules();
    neonMock.mockClear();
    drizzleMock.mockClear();
    delete (globalThis as DbGlobal).__whatToEatDefaultDb;
    process.env.DATABASE_URL = "postgresql://default.example/what-to-eat";
  });

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
    delete (globalThis as DbGlobal).__whatToEatDefaultDb;
  });

  it("reuses one default database instance for repeated environment-backed calls", async () => {
    const { createDb } = await import("@/db");

    const first = createDb();
    const second = createDb();

    expect(second).toBe(first);
    expect(neonMock).toHaveBeenCalledOnce();
    expect(drizzleMock).toHaveBeenCalledOnce();
  }, 15_000);

  it("does not reuse the default instance when a database URL is passed explicitly", async () => {
    const { createDb } = await import("@/db");

    const defaultDb = createDb();
    const firstExplicit = createDb("postgresql://explicit.example/what-to-eat");
    const secondExplicit = createDb("postgresql://explicit.example/what-to-eat");

    expect(firstExplicit).not.toBe(defaultDb);
    expect(secondExplicit).not.toBe(defaultDb);
    expect(secondExplicit).not.toBe(firstExplicit);
    expect(neonMock).toHaveBeenCalledTimes(3);
    expect(drizzleMock).toHaveBeenCalledTimes(3);
  });
});
