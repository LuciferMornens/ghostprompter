import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HotkeyRecorder } from "./HotkeyRecorder";

describe("<HotkeyRecorder />", () => {
  it("renders the value prop initially", () => {
    render(<HotkeyRecorder value="F7" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "F7" })).toBeInTheDocument();
  });

  it("clicking toggles to recording state showing 'press keys...'", async () => {
    const user = userEvent.setup();
    render(<HotkeyRecorder value="F7" onChange={() => {}} />);
    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("button", { name: "press keys..." })).toBeInTheDocument();
  });

  it("captures F7", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<HotkeyRecorder value="F6" onChange={onChange} />);
    const btn = screen.getByRole("button");
    await user.click(btn);
    fireEvent.keyDown(btn, { key: "F7", code: "F7" });
    expect(onChange).toHaveBeenCalledWith("F7");
  });

  it("captures Control+Shift+S in correct order", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<HotkeyRecorder value="X" onChange={onChange} />);
    const btn = screen.getByRole("button");
    await user.click(btn);
    fireEvent.keyDown(btn, {
      key: "s",
      code: "KeyS",
      ctrlKey: true,
      shiftKey: true,
    });
    expect(onChange).toHaveBeenCalledWith("Control+Shift+S");
  });

  it("captures plain 'a' as 'A'", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<HotkeyRecorder value="X" onChange={onChange} />);
    const btn = screen.getByRole("button");
    await user.click(btn);
    fireEvent.keyDown(btn, { key: "a", code: "KeyA" });
    expect(onChange).toHaveBeenCalledWith("A");
  });

  it("captures ArrowUp as 'Up'", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<HotkeyRecorder value="X" onChange={onChange} />);
    const btn = screen.getByRole("button");
    await user.click(btn);
    fireEvent.keyDown(btn, { key: "ArrowUp", code: "ArrowUp" });
    expect(onChange).toHaveBeenCalledWith("Up");
  });

  it("captures Space as 'Space'", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<HotkeyRecorder value="X" onChange={onChange} />);
    const btn = screen.getByRole("button");
    await user.click(btn);
    fireEvent.keyDown(btn, { key: " ", code: "Space" });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("Space");
  });

  it("captures Escape", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<HotkeyRecorder value="X" onChange={onChange} />);
    const btn = screen.getByRole("button");
    await user.click(btn);
    fireEvent.keyDown(btn, { key: "Escape", code: "Escape" });
    expect(onChange).toHaveBeenCalledWith("Escape");
  });

  it("modifier-only Shift press does not call onChange", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<HotkeyRecorder value="X" onChange={onChange} />);
    const btn = screen.getByRole("button");
    await user.click(btn);
    fireEvent.keyDown(btn, { key: "Shift", shiftKey: true, code: "ShiftLeft" });
    expect(onChange).not.toHaveBeenCalled();
    // Still recording
    expect(
      screen.getByRole("button", { name: "press keys..." }),
    ).toBeInTheDocument();
  });

  it("captures Shift+1 not Shift+! for shifted digit", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<HotkeyRecorder value="X" onChange={onChange} />);
    const btn = screen.getByRole("button");
    await user.click(btn);
    fireEvent.keyDown(btn, {
      key: "!",
      code: "Digit1",
      shiftKey: true,
    });
    expect(onChange).toHaveBeenCalledWith("Shift+1");
  });

  it("captures Shift+/ not Shift+? for shifted punctuation", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<HotkeyRecorder value="X" onChange={onChange} />);
    const btn = screen.getByRole("button");
    await user.click(btn);
    fireEvent.keyDown(btn, {
      key: "?",
      code: "Slash",
      shiftKey: true,
    });
    expect(onChange).toHaveBeenCalledWith("Shift+/");
  });

  it("captures Shift+2 not Shift+@ for shifted digit 2", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<HotkeyRecorder value="X" onChange={onChange} />);
    const btn = screen.getByRole("button");
    await user.click(btn);
    fireEvent.keyDown(btn, {
      key: "@",
      code: "Digit2",
      shiftKey: true,
    });
    expect(onChange).toHaveBeenCalledWith("Shift+2");
  });

  it("captures Shift+; not Shift+: for shifted semicolon", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<HotkeyRecorder value="X" onChange={onChange} />);
    const btn = screen.getByRole("button");
    await user.click(btn);
    fireEvent.keyDown(btn, {
      key: ":",
      code: "Semicolon",
      shiftKey: true,
    });
    expect(onChange).toHaveBeenCalledWith("Shift+;");
  });

  it("captures unshifted / correctly via code", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<HotkeyRecorder value="X" onChange={onChange} />);
    const btn = screen.getByRole("button");
    await user.click(btn);
    fireEvent.keyDown(btn, {
      key: "/",
      code: "Slash",
    });
    expect(onChange).toHaveBeenCalledWith("/");
  });

  it("after a successful capture, recording state ends and shows new value", async () => {
    const Wrapper = () => {
      const [v, setV] = useState("F1");
      return <HotkeyRecorder value={v} onChange={setV} />;
    };
    const user = userEvent.setup();
    render(<Wrapper />);
    const btn = screen.getByRole("button");
    await user.click(btn);
    fireEvent.keyDown(btn, { key: "F4", code: "F4" });
    // After change, parent re-renders with new value, recording flips off
    expect(screen.getByRole("button", { name: "F4" })).toBeInTheDocument();
  });
});
