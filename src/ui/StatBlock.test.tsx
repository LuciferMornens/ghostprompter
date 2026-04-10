import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatBlock } from "./StatBlock";
import type { StatBlockProps } from "./StatBlock";

describe("<StatBlock />", () => {
  it("renders label and value", () => {
    render(<StatBlock label="Words" value={128} />);
    expect(screen.getByText("Words")).toBeInTheDocument();
    expect(screen.getByText("128")).toBeInTheDocument();
  });

  it("renders string value", () => {
    render(<StatBlock label="Read time" value="2:30" />);
    expect(screen.getByText("2:30")).toBeInTheDocument();
  });

  it("renders numeric value", () => {
    render(<StatBlock label="Chars" value={1024} />);
    expect(screen.getByText("1024")).toBeInTheDocument();
  });

  it("label span has data-gp-stat-label attribute", () => {
    const { container } = render(<StatBlock label="WORDS" value="1" />);
    expect(container.querySelector("[data-gp-stat-label]")).not.toBeNull();
  });

  it("value span has data-gp-stat-value attribute", () => {
    const { container } = render(<StatBlock label="WORDS" value="1" />);
    expect(container.querySelector("[data-gp-stat-value]")).not.toBeNull();
  });

  it("supports a hint line", () => {
    render(<StatBlock label="TIME" value="1:23" hint="at 150 wpm" />);
    expect(screen.getByText("at 150 wpm")).toBeInTheDocument();
  });

  it("does not render hint when not provided", () => {
    const { container } = render(<StatBlock label="Words" value={42} />);
    expect(container.querySelector(".gp-stat__hint")).toBeNull();
  });

  it("applies accent class when accent=true", () => {
    const { container } = render(
      <StatBlock label="Read time" value="1:00" accent />,
    );
    const valueEl = container.querySelector("[data-gp-stat-value]");
    expect(valueEl?.classList.contains("gp-stat__value--accent")).toBe(true);
  });

  it("does not apply accent class when accent is not provided", () => {
    const { container } = render(<StatBlock label="Words" value={10} />);
    const valueEl = container.querySelector("[data-gp-stat-value]");
    expect(valueEl?.classList.contains("gp-stat__value--accent")).toBe(false);
  });

  it("applies custom className", () => {
    const { container } = render(
      <StatBlock label="Words" value={10} className="custom-class" />,
    );
    const root = container.firstElementChild;
    expect(root?.classList.contains("custom-class")).toBe(true);
    expect(root?.classList.contains("gp-stat")).toBe(true);
  });

  it("has gp-stat root class by default", () => {
    const { container } = render(<StatBlock label="X" value={0} />);
    expect(container.firstElementChild?.classList.contains("gp-stat")).toBe(
      true,
    );
  });

  it("exports StatBlockProps type", () => {
    const props: StatBlockProps = {
      label: "Words",
      value: 128,
      hint: "hint",
      accent: true,
      className: "test",
    };
    expect(props.label).toBe("Words");
  });

  it("renders hint with gp-stat__hint class", () => {
    const { container } = render(
      <StatBlock label="Read time" value="3:00" hint="150 wpm" />,
    );
    const hintEl = container.querySelector(".gp-stat__hint");
    expect(hintEl).not.toBeNull();
    expect(hintEl?.textContent).toBe("150 wpm");
  });

  it("renders label, value, and hint together", () => {
    render(
      <StatBlock label="Read time" value="1:23" hint="150 wpm" accent />,
    );
    expect(screen.getByText("Read time")).toBeInTheDocument();
    expect(screen.getByText("1:23")).toBeInTheDocument();
    expect(screen.getByText("150 wpm")).toBeInTheDocument();
  });
});
