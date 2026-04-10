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

  it("renders the 'Ghostprompter' wordmark", () => {
    const { container } = render(<BrandMark />);
    const title = container.querySelector(".gp-wordmark-title");
    expect(title).not.toBeNull();
    expect(title!.textContent?.toLowerCase()).toContain("ghostprompter");
  });

  it("renders the tagline 'a quiet teleprompter'", () => {
    const { container } = render(<BrandMark />);
    const kicker = container.querySelector(".gp-wordmark-kicker");
    expect(kicker).not.toBeNull();
    expect(kicker!.textContent?.toLowerCase()).toContain("a quiet teleprompter");
  });

  it("renders the full brand cluster: SVG + wordmark + tagline", () => {
    const { container } = render(<BrandMark />);
    const root = container.firstElementChild!;
    // SVG present
    expect(root.querySelector("svg")).not.toBeNull();
    // Wordmark wrapper present
    expect(root.querySelector(".gp-wordmark")).not.toBeNull();
    // Title and kicker both inside the wrapper
    expect(root.querySelector(".gp-wordmark-title")).not.toBeNull();
    expect(root.querySelector(".gp-wordmark-kicker")).not.toBeNull();
  });

  it("wordmark uses gp-wordmark-title class (styled via design tokens)", () => {
    const { container } = render(<BrandMark />);
    const title = container.querySelector(".gp-wordmark-title");
    expect(title).not.toBeNull();
  });

  it("tagline uses gp-wordmark-kicker class (styled via design tokens)", () => {
    const { container } = render(<BrandMark />);
    const kicker = container.querySelector(".gp-wordmark-kicker");
    expect(kicker).not.toBeNull();
  });

  it("wordmark contains italic emphasis on 'prompter'", () => {
    const { container } = render(<BrandMark />);
    const em = container.querySelector(".gp-wordmark-title em");
    expect(em).not.toBeNull();
    expect(em!.textContent).toBe("prompter");
  });
});
