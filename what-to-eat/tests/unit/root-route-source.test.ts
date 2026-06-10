import { redirect } from "next/navigation";
import { describe, expect, it, vi } from "vitest";

import RootPage from "@/app/page";
import { routing } from "@/i18n/routing";

vi.mock("next/navigation", () => ({
  redirect: vi.fn()
}));

describe("root route", () => {
  it("redirects the bare project URL to the default Chinese locale", () => {
    RootPage();

    expect(redirect).toHaveBeenCalledWith(`/${routing.defaultLocale}`);
  });
});
