import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToolbarButton } from "./ToolbarButton";
import type { ToolbarButtonProps } from "./ToolbarButton";

describe("<ToolbarButton />", () => {
  it("renders children as label", () => {
    render(<ToolbarButton onClick={() => {}}>Save</ToolbarButton>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("renders a semantic <button> element", () => {
    render(<ToolbarButton onClick={() => {}}>Action</ToolbarButton>);
    const btn = screen.getByRole("button", { name: "Action" });
    expect(btn.tagName).toBe("BUTTON");
  });

  it("fires onClick exactly once when clicked", async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<ToolbarButton onClick={handler}>Click me</ToolbarButton>);
    await user.click(screen.getByRole("button", { name: "Click me" }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("applies gp-btn and gp-btn--ghost classes", () => {
    render(<ToolbarButton onClick={() => {}}>Styled</ToolbarButton>);
    const btn = screen.getByRole("button", { name: "Styled" });
    expect(btn.classList.contains("gp-btn")).toBe(true);
    expect(btn.classList.contains("gp-btn--ghost")).toBe(true);
  });

  it("passes through custom className", () => {
    render(
      <ToolbarButton onClick={() => {}} className="extra-class">
        Custom
      </ToolbarButton>,
    );
    const btn = screen.getByRole("button", { name: "Custom" });
    expect(btn.classList.contains("extra-class")).toBe(true);
    expect(btn.classList.contains("gp-btn")).toBe(true);
    expect(btn.classList.contains("gp-btn--ghost")).toBe(true);
  });

  it("works without className prop", () => {
    render(<ToolbarButton onClick={() => {}}>No class</ToolbarButton>);
    const btn = screen.getByRole("button", { name: "No class" });
    expect(btn.className).toBe("gp-btn gp-btn--ghost");
  });

  it("renders complex children (JSX)", () => {
    render(
      <ToolbarButton onClick={() => {}}>
        <span data-testid="icon">★</span> Star
      </ToolbarButton>,
    );
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByText("Star")).toBeInTheDocument();
  });

  it("exports ToolbarButtonProps type", () => {
    const props: ToolbarButtonProps = {
      children: "Test",
      onClick: () => {},
      className: "optional",
    };
    expect(props.children).toBe("Test");
    expect(props.className).toBe("optional");
  });

  it("is importable from barrel", async () => {
    const barrel = await import("@/ui");
    expect(barrel.ToolbarButton).toBeDefined();
  });
});
