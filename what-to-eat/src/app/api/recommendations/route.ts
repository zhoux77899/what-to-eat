import { fail, ok } from "@/server/api-response";
import { getCurrentClerkUserId } from "@/server/auth";

export async function GET() {
  const userId = await getCurrentClerkUserId();

  if (!userId) {
    return fail("UNAUTHENTICATED");
  }

  return ok({
    recommendations: []
  });
}
