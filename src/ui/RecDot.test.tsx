import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { RecDot } from "./RecDot";
import type { RecDotProps } from "./RecDot";

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

  it("has aria-label for accessibility when active", () => {
    const { container } = render(<RecDot active />);
    const el = container.querySelector(".gp-rec-dot");
    expect(el?.getAttribute("aria-label")).toBeTruthy();
  });

  it("has aria-label for accessibility when idle", () => {
    const { container } = render(<RecDot active={false} />);
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

  it("active aria-label contains 'active'", () => {
    const { container } = render(<RecDot active />);
    const el = container.querySelector(".gp-rec-dot");
    expect(el?.getAttribute("aria-label")).toContain("active");
  });

  it("idle aria-label contains 'idle'", () => {
    const { container } = render(<RecDot active={false} />);
    const el = container.querySelector(".gp-rec-dot");
    expect(el?.getAttribute("aria-label")).toContain("idle");
  });

  it("renders as a span element", () => {
    const { container } = render(<RecDot active />);
    const el = container.querySelector(".gp-rec-dot");
    expect(el?.tagName).toBe("SPAN");
  });

  it("exports RecDotProps type", () => {
    const props: RecDotProps = { active: true };
    expect(props.active).toBe(true);
  });

  it("gp-rec-dot class is always present regardless of active state", () => {
    const { container: a } = render(<RecDot active />);
    const { container: b } = render(<RecDot active={false} />);
    expect(a.querySelector(".gp-rec-dot")).not.toBeNull();
    expect(b.querySelector(".gp-rec-dot")).not.toBeNull();
  });
});
