import { auth } from "@clerk/nextjs/server";

export async function getCurrentClerkUserId() {
  const session = await auth();
  return session.userId;
}
