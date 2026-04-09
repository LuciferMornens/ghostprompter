import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
}));
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
  save: vi.fn(),
}));
vi.mock("@tauri-apps/plugin-store", () => {
  const get = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockResolvedValue(undefined);
  const save = vi.fn().mockResolvedValue(undefined);
  class LazyStore {
    filename: string;
    constructor(n: string) {
      this.filename = n;
    }
    get = get;
    set = set;
    save = save;
  }
  return { LazyStore };
});

import { invoke } from "@tauri-apps/api/core";
import { EditorView } from "./EditorView";
import { useScriptStore } from "@/store/scriptStore";
import { useModeStore } from "@/store/modeStore";
import { useSettingsStore } from "@/store/settingsStore";
import { DEFAULT_SETTINGS } from "@/types";

const invokeMock = invoke as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  invokeMock.mockReset();
  invokeMock.mockResolvedValue(undefined);
  useModeStore.setState({
    mode: "editor",
    editMode: false,
    playing: false,
    hidden: false,
  });
  useScriptStore.setState({
    script: {
      path: null,
      name: "Untitled.md",
      content: "# Hello",
      dirty: false,
    },
  });
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS, loaded: true });
});

describe("<EditorView />", () => {
  it("renders the toolbar buttons New, Open, Save, Save As, Settings, Go", () => {
    render(<EditorView />);
    expect(screen.getByRole("button", { name: "New" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save As" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Settings" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Go/ })).toBeInTheDocument();
  });

  it("renders the script name in the header", () => {
    render(<EditorView />);
    expect(screen.getByText("Untitled.md")).toBeInTheDocument();
  });

  it("renders dirty marker when script.dirty is true", () => {
    useScriptStore.setState({
      script: {
        path: null,
        name: "Untitled.md",
        content: "# Hello",
        dirty: true,
      },
    });
    render(<EditorView />);
    expect(
      screen.getByLabelText("Script Untitled.md, unsaved changes"),
    ).toBeInTheDocument();
  });

  it("renders preview column with gp-prose", () => {
    const { container } = render(<EditorView />);
    expect(container.querySelector(".gp-prose")).not.toBeNull();
  });

  it("clicking Settings opens the settings modal", async () => {
    const user = userEvent.setup();
    render(<EditorView />);
    await user.click(screen.getByRole("button", { name: "Settings" }));
    expect(
      screen.getByRole("heading", { name: "Settings" }),
    ).toBeInTheDocument();
  });

  it("clicking Go launches the overlay command before registering hotkeys", async () => {
    Object.defineProperty(window.screen, "availWidth", {
      configurable: true,
      value: 1920,
    });
    Object.defineProperty(window.screen, "availHeight", {
      configurable: true,
      value: 1080,
    });

    const user = userEvent.setup();
    render(<EditorView />);
    await user.click(screen.getByRole("button", { name: /Go/ }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalled();
    });
    expect(useModeStore.getState().playing).toBe(false);
    expect(useModeStore.getState().mode).toBe("editor");

    const calls = invokeMock.mock.calls.map((c) => c[0]);
    expect(calls).toContain("enter_teleprompter_mode");
    expect(calls).toContain("register_hotkeys");
    const enterIdx = calls.indexOf("enter_teleprompter_mode");
    const regIdx = calls.indexOf("register_hotkeys");
    expect(enterIdx).toBeLessThan(regIdx);
    expect(invokeMock).toHaveBeenCalledWith(
      "enter_teleprompter_mode",
      expect.objectContaining({
        script: expect.objectContaining({
          name: "Untitled.md",
          content: "# Hello",
        }),
        rect: {
          x: 1160,
          y: 280,
          w: 720,
          h: 520,
        },
      }),
    );
  });

  it("if enter_teleprompter_mode rejects, calls window.alert and stays in editor", async () => {
    const alertSpy = vi.fn();
    vi.stubGlobal("alert", alertSpy);
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === "enter_teleprompter_mode") return Promise.reject("nope");
      return Promise.resolve(undefined);
    });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const user = userEvent.setup();
    render(<EditorView />);
    await user.click(screen.getByRole("button", { name: /Go/ }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });
    expect(useModeStore.getState().mode).toBe("editor");

    errSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("clicking New resets the script content to the default welcome message", async () => {
    useScriptStore.setState({
      script: {
        path: "/somewhere/foo.md",
        name: "foo.md",
        content: "stale",
        dirty: true,
      },
    });
    const user = userEvent.setup();
    render(<EditorView />);
    await user.click(screen.getByRole("button", { name: "New" }));
    const next = useScriptStore.getState().script;
    expect(next.path).toBeNull();
    expect(next.name).toBe("Untitled.md");
    expect(next.dirty).toBe(false);
    expect(next.content).not.toBe("stale");
    expect(next.content.length).toBeGreaterThan(0);
  });

  it("renders the Ghostprompter wordmark/brand in the header", () => {
    const { container } = render(<EditorView />);
    const header = container.querySelector("header");
    expect(header).not.toBeNull();
    expect(header!.textContent?.toLowerCase()).toContain("ghostprompter");
  });

  it("renders a SCRIPT label on the editor panel", () => {
    render(<EditorView />);
    expect(screen.getByText(/script/i)).toBeInTheDocument();
  });

  it("renders a PREVIEW label on the preview panel", () => {
    render(<EditorView />);
    expect(screen.getByText(/preview/i)).toBeInTheDocument();
  });

  it("renders a status bar with Words stat block", () => {
    useScriptStore.setState({
      script: {
        path: null,
        name: "Untitled.md",
        content: "one two three four five",
        dirty: false,
      },
    });
    render(<EditorView />);
    expect(screen.getByText("Words")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders a status bar with Chars stat block", () => {
    useScriptStore.setState({
      script: {
        path: null,
        name: "Untitled.md",
        content: "hello",
        dirty: false,
      },
    });
    render(<EditorView />);
    expect(screen.getByText("Chars")).toBeInTheDocument();
  });

  it("renders a status bar with Read time stat block", () => {
    useScriptStore.setState({
      script: {
        path: null,
        name: "Untitled.md",
        content: "one two three four five six seven eight",
        dirty: false,
      },
    });
    render(<EditorView />);
    expect(screen.getByText("Read time")).toBeInTheDocument();
  });

  it("Go button includes the word 'Go' to act as broadcast trigger", () => {
    render(<EditorView />);
    const btn = screen.getByRole("button", { name: /go/i });
    expect(btn).toBeInTheDocument();
  });
});
