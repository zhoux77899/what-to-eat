import { fail, ok } from "@/server/api-response";
import { getCurrentClerkUserId } from "@/server/auth";

export async function POST() {
  const userId = await getCurrentClerkUserId();

  if (!userId) {
    return fail("UNAUTHENTICATED");
  }

  return ok({
    status: "validation_required",
    validation: "not_implemented"
  });
}
