import { fail, failFromError, ok } from "@/server/api-response";
import { getCurrentClerkUserId } from "@/server/auth";
import { ensureUser, listRecommendations } from "@/server/data";

export async function GET() {
  const clerkUserId = await getCurrentClerkUserId();

  if (!clerkUserId) {
    return fail("UNAUTHENTICATED");
  }

  try {
    const user = await ensureUser(clerkUserId);
    return ok({ recommendations: await listRecommendations(user.id) });
  } catch (error) {
    return failFromError(error);
  }
}
