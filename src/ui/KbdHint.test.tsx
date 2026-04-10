import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { KbdHint } from "./KbdHint";
import type { KbdHintProps } from "./KbdHint";

describe("<KbdHint />", () => {
  it("renders a <kbd> element for each key", () => {
    const { container } = render(<KbdHint keys={["Ctrl", "S"]} label="Save" />);
    const kbds = container.querySelectorAll("kbd");
    expect(kbds).toHaveLength(2);
    expect(kbds[0].textContent).toBe("Ctrl");
    expect(kbds[1].textContent).toBe("S");
  });

  it("renders label text", () => {
    render(<KbdHint keys={["F7"]} label="Play" />);
    expect(screen.getByText("Play")).toBeInTheDocument();
  });

  it("renders single key correctly", () => {
    const { container } = render(<KbdHint keys={["Esc"]} label="Exit" />);
    const kbds = container.querySelectorAll("kbd");
    expect(kbds).toHaveLength(1);
    expect(kbds[0].textContent).toBe("Esc");
  });

  it("renders three keys", () => {
    const { container } = render(
      <KbdHint keys={["Ctrl", "Shift", "P"]} label="Palette" />,
    );
    const kbds = container.querySelectorAll("kbd");
    expect(kbds).toHaveLength(3);
  });

  it("renders label alongside kbd elements", () => {
    const { container } = render(
      <KbdHint keys={["Ctrl", "S"]} label="Save" />,
    );
    const kbds = container.querySelectorAll("kbd");
    expect(kbds).toHaveLength(2);
    expect(screen.getByText("Save")).toBeInTheDocument();
  });

  it("root element has gp-hothint class", () => {
    const { container } = render(<KbdHint keys={["F1"]} label="Help" />);
    expect(container.firstElementChild?.classList.contains("gp-hothint")).toBe(
      true,
    );
  });

  it("renders as a span element", () => {
    const { container } = render(<KbdHint keys={["F7"]} label="Play" />);
    expect(container.firstElementChild?.tagName).toBe("SPAN");
  });

  it("kbd count matches keys array length", () => {
    const keys = ["Ctrl", "Alt", "Delete"];
    const { container } = render(<KbdHint keys={keys} label="Reset" />);
    expect(container.querySelectorAll("kbd")).toHaveLength(keys.length);
  });

  it("exports KbdHintProps type", () => {
    const props: KbdHintProps = { keys: ["F7"], label: "Play" };
    expect(props.keys).toEqual(["F7"]);
    expect(props.label).toBe("Play");
  });

  it("is importable from barrel", async () => {
    const barrel = await import("@/ui");
    expect(barrel.KbdHint).toBeDefined();
  });
});
