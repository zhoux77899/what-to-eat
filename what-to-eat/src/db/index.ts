import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "@/db/schema";

type Database = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as typeof globalThis & {
  __whatToEatDefaultDb?: Database;
};

export function createDb(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  if (arguments.length > 0) {
    return drizzle(neon(databaseUrl), { schema });
  }

  if (!globalForDb.__whatToEatDefaultDb) {
    globalForDb.__whatToEatDefaultDb = drizzle(neon(databaseUrl), { schema });
  }

  return globalForDb.__whatToEatDefaultDb;
}
