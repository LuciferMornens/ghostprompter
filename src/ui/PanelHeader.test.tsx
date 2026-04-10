import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PanelHeader } from "./PanelHeader";

describe("<PanelHeader />", () => {
  it("renders the numeral", () => {
    render(<PanelHeader numeral="01" label="Script" meta="draft · markdown" />);
    expect(screen.getByText("01")).toBeInTheDocument();
  });

  it("renders the label", () => {
    render(<PanelHeader numeral="01" label="Script" meta="draft · markdown" />);
    expect(screen.getByText("Script")).toBeInTheDocument();
  });

  it("renders the meta text", () => {
    render(<PanelHeader numeral="01" label="Script" meta="draft · markdown" />);
    expect(screen.getByText("draft · markdown")).toBeInTheDocument();
  });

  it("marks the numeral as aria-hidden", () => {
    render(<PanelHeader numeral="02" label="Preview" meta="live render" />);
    const numeral = screen.getByText("02");
    expect(numeral.getAttribute("aria-hidden")).toBe("true");
  });

  it("marks the decorative rule as aria-hidden", () => {
    const { container } = render(
      <PanelHeader numeral="01" label="Script" meta="draft · markdown" />,
    );
    const rule = container.querySelector(".gp-panelhead__rule");
    expect(rule).not.toBeNull();
    expect(rule?.getAttribute("aria-hidden")).toBe("true");
  });

  it("applies gp-panelhead class", () => {
    const { container } = render(
      <PanelHeader numeral="01" label="Script" meta="draft · markdown" />,
    );
    expect(container.querySelector(".gp-panelhead")).not.toBeNull();
  });

  it("passes through additional className", () => {
    const { container } = render(
      <PanelHeader numeral="01" label="Script" meta="m" className="custom" />,
    );
    const root = container.firstElementChild;
    expect(root?.classList.contains("gp-panelhead")).toBe(true);
    expect(root?.classList.contains("custom")).toBe(true);
  });

  it("renders all three segments together", () => {
    render(<PanelHeader numeral="01" label="Script" meta="draft · markdown" />);
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("Script")).toBeInTheDocument();
    expect(screen.getByText("draft · markdown")).toBeInTheDocument();
  });
});
