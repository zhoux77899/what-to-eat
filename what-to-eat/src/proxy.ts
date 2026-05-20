import type { NextFetchEvent, NextRequest } from "next/server";

import rootProxy from "../proxy";

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  return rootProxy(request, event);
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)", "/api/(.*)", "/__clerk/(.*)"]
};
