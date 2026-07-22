import { render, screen } from "@testing-library/react";
import Link from "next/link";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/ui/button";

describe("Button skin", () => {
  it.each(["primary", "secondary", "danger"] as const)(
    "renders eight decorative edge and cap slices for the %s variant",
    (variant) => {
      const { container } = render(<Button variant={variant}>Save</Button>);

      expect(screen.getByRole("button", { name: "Save" })).toBeVisible();
      expect(container.querySelector(`.app-button-skin[data-tone="${variant}"]`)).not.toBeNull();
      expect(container.querySelectorAll(".app-button-skin-slice")).toHaveLength(8);
    }
  );

  it("keeps ghost controls unskinned", () => {
    const { container } = render(<Button variant="ghost">Close</Button>);

    expect(screen.getByRole("button", { name: "Close" })).toBeVisible();
    expect(container.querySelector(".app-button-skin")).toBeNull();
  });

  it("preserves asChild link semantics while injecting the skin", () => {
    const { container } = render(
      <Button asChild size="hero" variant="primary">
        <Link href="/en/app">Start cooking</Link>
      </Button>
    );
    const link = screen.getByRole("link", { name: "Start cooking" });

    expect(link).toHaveAttribute("href", "/en/app");
    expect(link).toHaveClass("app-button-surface", "app-button-size-hero");
    expect(container.querySelectorAll(".app-button-skin-slice")).toHaveLength(8);
  });

  it("keeps the native button ref and disabled state on the outer control", () => {
    const ref = createRef<HTMLButtonElement>();

    render(
      <Button disabled ref={ref} variant="danger">
        Delete
      </Button>
    );

    expect(ref.current).toBe(screen.getByRole("button", { name: "Delete" }));
    expect(ref.current).toBeDisabled();
    expect(ref.current?.querySelectorAll(".app-button-skin-slice")).toHaveLength(8);
  });
});
