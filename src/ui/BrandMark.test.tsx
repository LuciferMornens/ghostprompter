import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { BrandMark } from "./BrandMark";

describe("<BrandMark />", () => {
  it("renders an SVG element", () => {
    const { container } = render(<BrandMark />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
  });

  it("has aria-hidden=true on the container", () => {
    const { container } = render(<BrandMark />);
    const root = container.firstElementChild;
    expect(root?.getAttribute("aria-hidden")).toBe("true");
  });

  it("applies the gp-brand-mark class", () => {
    const { container } = render(<BrandMark />);
    expect(container.querySelector(".gp-brand-mark")).not.toBeNull();
  });

  it("passes through additional className", () => {
    const { container } = render(<BrandMark className="extra" />);
    const root = container.firstElementChild;
    expect(root?.classList.contains("gp-brand-mark")).toBe(true);
    expect(root?.classList.contains("extra")).toBe(true);
  });

  it("uses design token variables for SVG stroke (no hardcoded hex)", () => {
    const { container } = render(<BrandMark />);
    const path = container.querySelector("path");
    const stroke = path?.getAttribute("stroke") ?? "";
    expect(stroke).toMatch(/^var\(--/);
  });

  it("uses design token variables for SVG fill (no hardcoded hex)", () => {
    const { container } = render(<BrandMark />);
    const circles = container.querySelectorAll("circle");
    for (const circle of circles) {
      const fill = circle.getAttribute("fill") ?? "";
      expect(fill).toMatch(/^var\(--/);
    }
  });

  it("renders the ghost icon with eyes (two circles)", () => {
    const { container } = render(<BrandMark />);
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBe(2);
  });
});
