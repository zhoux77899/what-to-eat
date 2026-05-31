import type { NextRequest } from "next/server";
import type { z } from "zod";

export async function parseJsonBody<TSchema extends z.ZodType>(
  request: NextRequest,
  schema: TSchema
) {
  try {
    const body = await request.json();
    return schema.safeParse(body);
  } catch {
    return schema.safeParse(undefined);
  }
}
