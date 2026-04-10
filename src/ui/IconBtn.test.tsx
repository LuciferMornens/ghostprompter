import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IconBtn } from "./IconBtn";
import type { IconBtnProps } from "./IconBtn";

describe("<IconBtn />", () => {
  it("renders children", () => {
    render(
      <IconBtn onClick={() => {}} ariaLabel="Play">
        u25b6
      </IconBtn>,
    );
    expect(screen.getByText("u25b6")).toBeInTheDocument();
  });

  it("renders a semantic <button> element", () => {
    render(
      <IconBtn onClick={() => {}} ariaLabel="Play">
        u25b6
      </IconBtn>,
    );
    const btn = screen.getByRole("button", { name: "Play" });
    expect(btn.tagName).toBe("BUTTON");
  });

  it("fires onClick when clicked", async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(
      <IconBtn onClick={handler} ariaLabel="Play">
        u25b6
      </IconBtn>,
    );
    await user.click(screen.getByRole("button", { name: "Play" }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("sets aria-label from ariaLabel prop", () => {
    render(
      <IconBtn onClick={() => {}} ariaLabel="Play">
        u25b6
      </IconBtn>,
    );
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });

  it("falls back to title for aria-label when ariaLabel is not provided", () => {
    render(
      <IconBtn onClick={() => {}} title="Play">
        u25b6
      </IconBtn>,
    );
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });

  it("adds gp-icn-hot class when hot=true", () => {
    render(
      <IconBtn onClick={() => {}} ariaLabel="Active" hot>
        u25b6
      </IconBtn>,
    );
    const btn = screen.getByRole("button", { name: "Active" });
    expect(btn.classList.contains("gp-icn-hot")).toBe(true);
  });

  it("does not add gp-icn-hot class when hot=false", () => {
    render(
      <IconBtn onClick={() => {}} ariaLabel="Inactive">
        u25b6
      </IconBtn>,
    );
    const btn = screen.getByRole("button", { name: "Inactive" });
    expect(btn.classList.contains("gp-icn-hot")).toBe(false);
  });

  it("adds gp-icn--compact class when compact=true", () => {
    render(
      <IconBtn onClick={() => {}} ariaLabel="Compact" compact>
        u25b6
      </IconBtn>,
    );
    const btn = screen.getByRole("button", { name: "Compact" });
    expect(btn.classList.contains("gp-icn--compact")).toBe(true);
  });

  it("does not add gp-icn--compact class when compact=false", () => {
    render(
      <IconBtn onClick={() => {}} ariaLabel="Normal">
        u25b6
      </IconBtn>,
    );
    const btn = screen.getByRole("button", { name: "Normal" });
    expect(btn.classList.contains("gp-icn--compact")).toBe(false);
  });

  it("disables the button when disabled=true", () => {
    render(
      <IconBtn onClick={() => {}} ariaLabel="Disabled" disabled>
        u25b6
      </IconBtn>,
    );
    const btn = screen.getByRole("button", { name: "Disabled" });
    expect(btn).toBeDisabled();
  });

  it("prevents onClick when disabled", async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(
      <IconBtn onClick={handler} ariaLabel="No click" disabled>
        u25b6
      </IconBtn>,
    );
    await user.click(screen.getByRole("button", { name: "No click" }));
    expect(handler).not.toHaveBeenCalled();
  });

  it("passes through custom className", () => {
    render(
      <IconBtn onClick={() => {}} ariaLabel="Custom" className="gp-icn--danger">
        u2718
      </IconBtn>,
    );
    const btn = screen.getByRole("button", { name: "Custom" });
    expect(btn.classList.contains("gp-icn--danger")).toBe(true);
    expect(btn.classList.contains("gp-icn")).toBe(true);
  });

  it("applies all classes simultaneously: hot + compact + className", () => {
    render(
      <IconBtn
        onClick={() => {}}
        ariaLabel="Multi"
        hot
        compact
        className="gp-icn--primary"
      >
        u25b6
      </IconBtn>,
    );
    const btn = screen.getByRole("button", { name: "Multi" });
    expect(btn.classList.contains("gp-icn")).toBe(true);
    expect(btn.classList.contains("gp-icn-hot")).toBe(true);
    expect(btn.classList.contains("gp-icn--compact")).toBe(true);
    expect(btn.classList.contains("gp-icn--primary")).toBe(true);
  });

  it("base class gp-icn always present", () => {
    render(
      <IconBtn onClick={() => {}} ariaLabel="Base">
        u25b6
      </IconBtn>,
    );
    const btn = screen.getByRole("button", { name: "Base" });
    expect(btn.classList.contains("gp-icn")).toBe(true);
  });

  it("exports IconBtnProps type", () => {
    const props: IconBtnProps = {
      children: "u25b6",
      onClick: () => {},
      ariaLabel: "Play",
      hot: true,
      compact: false,
      disabled: false,
      className: "extra",
    };
    expect(props.ariaLabel).toBe("Play");
    expect(props.hot).toBe(true);
  });

  it("is importable from barrel", async () => {
    const barrel = await import("@/ui");
    expect(barrel.IconBtn).toBeDefined();
  });
});
