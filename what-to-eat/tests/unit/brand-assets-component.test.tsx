import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppIconImage, BrandLogoImage } from "@/components/brand-assets";

describe("brand asset components", () => {
  it("renders the Chinese header logo asset with an accessible label", () => {
    render(<BrandLogoImage label="今天吃什么" locale="zh" />);

    const logo = screen.getByRole("img", { name: "今天吃什么" });

    expect(logo).toHaveAttribute("src", "/brand/header-logo-zh.webp");
    expect(logo).toHaveClass("brand-logo-image");
  });

  it("renders the English header logo asset with the same component contract", () => {
    render(<BrandLogoImage label="What to eat" locale="en" />);

    expect(screen.getByRole("img", { name: "What to eat" })).toHaveAttribute(
      "src",
      "/brand/header-logo-en.webp"
    );
  });

  it("renders the application icon asset", () => {
    render(<AppIconImage label="App icon" />);

    expect(screen.getByRole("img", { name: "App icon" })).toHaveAttribute(
      "src",
      "/brand/app-icon-512.png"
    );
  });
});
