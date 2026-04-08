import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { RecDot } from "./RecDot";

describe("<RecDot />", () => {
  it("renders an element with gp-rec-dot when active", () => {
    const { container } = render(<RecDot active />);
    const el = container.querySelector(".gp-rec-dot");
    expect(el).not.toBeNull();
    expect(el?.classList.contains("gp-rec-dot--idle")).toBe(false);
  });

  it("renders an element with gp-rec-dot--idle when not active", () => {
    const { container } = render(<RecDot active={false} />);
    const el = container.querySelector(".gp-rec-dot");
    expect(el).not.toBeNull();
    expect(el?.classList.contains("gp-rec-dot--idle")).toBe(true);
  });

  it("has aria-label for accessibility", () => {
    const { container } = render(<RecDot active />);
    const el = container.querySelector(".gp-rec-dot");
    expect(el?.getAttribute("aria-label")).toBeTruthy();
  });

  it("different aria-label for active vs idle state", () => {
    const { container: a } = render(<RecDot active />);
    const { container: b } = render(<RecDot active={false} />);
    const la = a.querySelector(".gp-rec-dot")?.getAttribute("aria-label");
    const lb = b.querySelector(".gp-rec-dot")?.getAttribute("aria-label");
    expect(la).not.toBe(lb);
  });
});
