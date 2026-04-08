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
    // The dirty marker is rendered in the same span as the name with " •"
    expect(screen.getByText("Untitled.md •")).toBeInTheDocument();
  });

  it("renders preview column with gp-prose", () => {
    const { container } = render(<EditorView />);
    expect(container.querySelector(".gp-prose")).not.toBeNull();
  });

  it("clicking Settings opens the settings modal", async () => {
    const user = userEvent.setup();
    render(<EditorView />);
    await user.click(screen.getByRole("button", { name: "Settings" }));
    // The modal contains an h2 "Settings"
    expect(
      screen.getByRole("heading", { name: "Settings" }),
    ).toBeInTheDocument();
  });

  it("clicking Go → calls invoke for enter_teleprompter_mode then register_hotkeys, then sets mode", async () => {
    const user = userEvent.setup();
    render(<EditorView />);
    await user.click(screen.getByRole("button", { name: /Go/ }));

    await waitFor(() => {
      expect(useModeStore.getState().mode).toBe("teleprompter");
    });
    expect(useModeStore.getState().playing).toBe(false);

    const calls = invokeMock.mock.calls.map((c) => c[0]);
    expect(calls).toContain("enter_teleprompter_mode");
    expect(calls).toContain("register_hotkeys");
    // Order: enter_teleprompter_mode before register_hotkeys
    const enterIdx = calls.indexOf("enter_teleprompter_mode");
    const regIdx = calls.indexOf("register_hotkeys");
    expect(enterIdx).toBeLessThan(regIdx);
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

  it("renders the GhostPrompter wordmark/brand in the header", () => {
    render(<EditorView />);
    // Broadcast-style brand text is present somewhere in the header
    expect(screen.getByText(/ghostprompter/i)).toBeInTheDocument();
  });

  it("renders the SCRIPT channel label on the editor panel", () => {
    render(<EditorView />);
    expect(screen.getByText(/script/i)).toBeInTheDocument();
  });

  it("renders the PREVIEW channel label on the preview panel", () => {
    render(<EditorView />);
    expect(screen.getByText(/preview/i)).toBeInTheDocument();
  });

  it("renders a status bar with WORDS stat block", () => {
    useScriptStore.setState({
      script: {
        path: null,
        name: "Untitled.md",
        content: "one two three four five",
        dirty: false,
      },
    });
    render(<EditorView />);
    expect(screen.getByText("WORDS")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders a status bar with CHARS stat block", () => {
    useScriptStore.setState({
      script: {
        path: null,
        name: "Untitled.md",
        content: "hello",
        dirty: false,
      },
    });
    render(<EditorView />);
    expect(screen.getByText("CHARS")).toBeInTheDocument();
  });

  it("renders a status bar with READ TIME stat block", () => {
    useScriptStore.setState({
      script: {
        path: null,
        name: "Untitled.md",
        content: "one two three four five six seven eight",
        dirty: false,
      },
    });
    render(<EditorView />);
    expect(screen.getByText("READ TIME")).toBeInTheDocument();
  });

  it("Go button includes the word LIVE or GO to act as broadcast trigger", () => {
    render(<EditorView />);
    // Either GO or GO LIVE is acceptable (test existing contract: name must match /Go/)
    const btn = screen.getByRole("button", { name: /go/i });
    expect(btn).toBeInTheDocument();
  });
});
