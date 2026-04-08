import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
  save: vi.fn(),
}));

import { MarkdownEditor } from "./MarkdownEditor";
import { useScriptStore } from "@/store/scriptStore";

beforeEach(() => {
  useScriptStore.setState({
    script: {
      path: null,
      name: "Untitled.md",
      content: "Initial content",
      dirty: false,
    },
  });
});

describe("<MarkdownEditor />", () => {
  it("renders a textarea with role textbox", () => {
    render(<MarkdownEditor />);
    const ta = screen.getByRole("textbox");
    expect(ta.tagName).toBe("TEXTAREA");
  });

  it("displays the current scriptStore content as its value", () => {
    render(<MarkdownEditor />);
    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(ta.value).toBe("Initial content");
  });

  it("has a placeholder", () => {
    render(<MarkdownEditor />);
    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(ta.placeholder.length).toBeGreaterThan(0);
    expect(ta.placeholder.toLowerCase()).toContain("markdown");
  });

  it("typing updates the script store content", async () => {
    const user = userEvent.setup();
    // Start with empty content so userEvent.type appends predictably.
    useScriptStore.setState({
      script: {
        path: null,
        name: "Untitled.md",
        content: "",
        dirty: false,
      },
    });
    render(<MarkdownEditor />);
    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;
    await user.type(ta, "abc");
    expect(useScriptStore.getState().script.content).toBe("abc");
  });
});
