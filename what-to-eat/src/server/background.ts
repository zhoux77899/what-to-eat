import { after } from "next/server";

export function runAfterResponse(task: () => Promise<void>) {
  after(async () => {
    try {
      await task();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown background task error";
      console.warn(`Background image task failed: ${message}`);
    }
  });
}
