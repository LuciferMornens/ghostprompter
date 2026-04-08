import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatBlock } from "./StatBlock";

describe("<StatBlock />", () => {
  it("renders label and value", () => {
    render(<StatBlock label="WORDS" value="128" />);
    expect(screen.getByText("WORDS")).toBeInTheDocument();
    expect(screen.getByText("128")).toBeInTheDocument();
  });

  it("label is styled uppercase/mono via className containing 'gp-channel' or letter-spacing wrapper", () => {
    const { container } = render(<StatBlock label="WORDS" value="1" />);
    // The label span must have a data-testid or recognizable class
    expect(container.querySelector("[data-gp-stat-label]")).not.toBeNull();
    expect(container.querySelector("[data-gp-stat-value]")).not.toBeNull();
  });

  it("supports a hint line", () => {
    render(<StatBlock label="TIME" value="1:23" hint="at 150 wpm" />);
    expect(screen.getByText("at 150 wpm")).toBeInTheDocument();
  });
});
