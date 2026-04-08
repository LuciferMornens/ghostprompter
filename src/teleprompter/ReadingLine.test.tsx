import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ReadingLine } from "./ReadingLine";

describe("<ReadingLine />", () => {
  it("renders an element with class gp-reading-line", () => {
    const { container } = render(<ReadingLine offset={0.4} />);
    const el = container.querySelector(".gp-reading-line");
    expect(el).not.toBeNull();
  });

  it("sets inline top style based on offset (0.4 → 40%)", () => {
    const { container } = render(<ReadingLine offset={0.4} />);
    const el = container.querySelector(".gp-reading-line") as HTMLDivElement;
    expect(el.style.top).toBe("40%");
  });

  it("renders 0% when offset is 0", () => {
    const { container } = render(<ReadingLine offset={0} />);
    const el = container.querySelector(".gp-reading-line") as HTMLDivElement;
    expect(el.style.top).toBe("0%");
  });

  it("renders 100% when offset is 1", () => {
    const { container } = render(<ReadingLine offset={1} />);
    const el = container.querySelector(".gp-reading-line") as HTMLDivElement;
    expect(el.style.top).toBe("100%");
  });

  it("renders 50% when offset is 0.5", () => {
    const { container } = render(<ReadingLine offset={0.5} />);
    const el = container.querySelector(".gp-reading-line") as HTMLDivElement;
    expect(el.style.top).toBe("50%");
  });

  it("has aria-hidden attribute set", () => {
    const { container } = render(<ReadingLine offset={0.4} />);
    const el = container.querySelector(".gp-reading-line") as HTMLDivElement;
    expect(el.getAttribute("aria-hidden")).toBe("true");
  });
});
