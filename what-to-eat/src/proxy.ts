import type { NextFetchEvent, NextRequest } from "next/server";

import requestProxy from "@/server/request-proxy";

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  return requestProxy(request, event);
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)", "/api/(.*)", "/__clerk/(.*)"]
};
