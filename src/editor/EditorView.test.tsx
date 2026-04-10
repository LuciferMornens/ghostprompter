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
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { EditorView } from "./EditorView";
import { useScriptStore } from "@/store/scriptStore";
import { useModeStore } from "@/store/modeStore";
import { useSettingsStore } from "@/store/settingsStore";
import { DEFAULT_SETTINGS } from "@/types";
import type { Script } from "@/types";

const invokeMock = invoke as unknown as ReturnType<typeof vi.fn>;
const openDialogMock = openDialog as unknown as ReturnType<typeof vi.fn>;
const saveDialogMock = saveDialog as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  invokeMock.mockReset();
  invokeMock.mockResolvedValue(undefined);
  openDialogMock.mockReset();
  saveDialogMock.mockReset();
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

/* ============================================================
   VAL-EDIT-001: structural elements (header, main > 2 sections, footer)
   ============================================================ */
describe("<EditorView /> — top bar structure (VAL-EDIT-001)", () => {
  it("renders a <header>, a <main> with ≥ 2 <section> children, and a <footer>", () => {
    const { container } = render(<EditorView />);
    expect(container.querySelector("header")).not.toBeNull();
    const main = container.querySelector("main");
    expect(main).not.toBeNull();
    const sections = main!.querySelectorAll(":scope > section");
    expect(sections.length).toBeGreaterThanOrEqual(2);
    expect(container.querySelector("footer")).not.toBeNull();
  });
});

/* ============================================================
   VAL-EDIT-002: header contains BrandMark SVG, script name, toolbar buttons
   ============================================================ */
describe("<EditorView /> — top bar content (VAL-EDIT-002)", () => {
  it("header contains an SVG element (ghost icon)", () => {
    const { container } = render(<EditorView />);
    const header = container.querySelector("header");
    expect(header!.querySelector("svg")).not.toBeNull();
  });

  it("header shows the 'Ghostprompter' wordmark with tagline", () => {
    const { container } = render(<EditorView />);
    const header = container.querySelector("header");
    const text = header!.textContent!.toLowerCase();
    expect(text).toContain("ghostprompter");
    expect(text).toContain("a quiet teleprompter");
  });

  it("header shows the script name from scriptStore", () => {
    useScriptStore.setState({
      script: {
        path: "/test/demo.md",
        name: "demo.md",
        content: "",
        dirty: false,
      },
    });
    render(<EditorView />);
    expect(screen.getByText("demo.md")).toBeInTheDocument();
  });

  it("header has buttons: New, Open, Save, Save As, Settings via getByRole", () => {
    render(<EditorView />);
    for (const name of ["New", "Open", "Save", "Save As", "Settings"]) {
      expect(
        screen.getByRole("button", { name }),
      ).toBeInTheDocument();
    }
  });
});

/* ============================================================
   VAL-EDIT-003: file indicator dirty/clean states
   ============================================================ */
describe("<EditorView /> — file indicator (VAL-EDIT-003)", () => {
  it("shows 'Draft' badge when dirty=true", () => {
    useScriptStore.setState({
      script: {
        path: null,
        name: "Untitled.md",
        content: "changed",
        dirty: true,
      },
    });
    render(<EditorView />);
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("shows 'Saved' badge when dirty=false", () => {
    useScriptStore.setState({
      script: {
        path: null,
        name: "Untitled.md",
        content: "",
        dirty: false,
      },
    });
    render(<EditorView />);
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("dirty dot has aria-label containing 'unsaved changes' when dirty=true", () => {
    useScriptStore.setState({
      script: {
        path: null,
        name: "Untitled.md",
        content: "dirty content",
        dirty: true,
      },
    });
    const { container } = render(<EditorView />);
    const dot = container.querySelector(".gp-filecrest__dot");
    expect(dot).not.toBeNull();
    expect(dot!.getAttribute("aria-label")).toMatch(/unsaved changes/i);
  });

  it("dirty dot is aria-hidden when dirty=false", () => {
    const { container } = render(<EditorView />);
    const dot = container.querySelector(".gp-filecrest__dot");
    expect(dot).not.toBeNull();
    expect(dot!.getAttribute("aria-hidden")).toBe("true");
  });
});

/* ============================================================
   VAL-EDIT-004: Go Live CTA has aria-label and visible text
   ============================================================ */
describe("<EditorView /> — Go Live CTA (VAL-EDIT-004)", () => {
  it("Go Live button resolves via getByRole('button', { name: /go live/i })", () => {
    render(<EditorView />);
    expect(
      screen.getByRole("button", { name: /go live/i }),
    ).toBeInTheDocument();
  });

  it("Go Live button has visible text containing 'Go'", () => {
    render(<EditorView />);
    const btn = screen.getByRole("button", { name: /go live/i });
    expect(btn.textContent).toContain("Go");
  });
});

/* ============================================================
   VAL-EDIT-005: Open button triggers file dialog and read_script IPC
   ============================================================ */
describe("<EditorView /> — Open file flow (VAL-EDIT-005)", () => {
  it("clicking Open invokes the file open dialog", async () => {
    openDialogMock.mockResolvedValueOnce(null);
    const user = userEvent.setup();
    render(<EditorView />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await waitFor(() => {
      expect(openDialogMock).toHaveBeenCalledTimes(1);
    });
  });

  it("when a file is selected, invokes 'read_script' with chosen path", async () => {
    const chosenPath = "/home/user/script.md";
    const returned: Script = {
      path: chosenPath,
      name: "script.md",
      content: "# loaded content",
      dirty: false,
    };
    openDialogMock.mockResolvedValueOnce(chosenPath);
    invokeMock.mockResolvedValueOnce(returned);

    const user = userEvent.setup();
    render(<EditorView />);
    await user.click(screen.getByRole("button", { name: "Open" }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("read_script", { path: chosenPath });
    });
    // Script store updated with returned script
    expect(useScriptStore.getState().script).toEqual(returned);
  });

  it("when dialog is cancelled (null), does not invoke read_script", async () => {
    openDialogMock.mockResolvedValueOnce(null);
    const user = userEvent.setup();
    render(<EditorView />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await waitFor(() => {
      expect(openDialogMock).toHaveBeenCalled();
    });
    expect(invokeMock).not.toHaveBeenCalledWith("read_script", expect.anything());
  });
});

/* ============================================================
   VAL-EDIT-006: Save button triggers save_script IPC
   ============================================================ */
describe("<EditorView /> — Save file flow (VAL-EDIT-006)", () => {
  it("clicking Save with existing path calls save_script with correct payload", async () => {
    useScriptStore.setState({
      script: {
        path: "/tmp/my-script.md",
        name: "my-script.md",
        content: "Hello world",
        dirty: true,
      },
    });
    invokeMock.mockResolvedValueOnce("/tmp/my-script.md");

    const user = userEvent.setup();
    render(<EditorView />);
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("save_script", {
        path: "/tmp/my-script.md",
        content: "Hello world",
      });
    });
  });

  it("clicking Save with no path opens save dialog, then calls save_script", async () => {
    useScriptStore.setState({
      script: {
        path: null,
        name: "Untitled.md",
        content: "new content",
        dirty: true,
      },
    });
    saveDialogMock.mockResolvedValueOnce("/tmp/saved.md");
    invokeMock.mockResolvedValueOnce("/tmp/saved.md");

    const user = userEvent.setup();
    render(<EditorView />);
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(saveDialogMock).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("save_script", {
        path: "/tmp/saved.md",
        content: "new content",
      });
    });
  });

  it("after save, script.dirty becomes false", async () => {
    useScriptStore.setState({
      script: {
        path: "/tmp/my-script.md",
        name: "my-script.md",
        content: "content",
        dirty: true,
      },
    });
    invokeMock.mockResolvedValueOnce("/tmp/my-script.md");

    const user = userEvent.setup();
    render(<EditorView />);
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(useScriptStore.getState().script.dirty).toBe(false);
    });
  });
});

/* ============================================================
   VAL-EDIT-013: Go Live triggers enter_teleprompter_mode IPC with script and rect
   ============================================================ */
describe("<EditorView /> — Go Live IPC payload (VAL-EDIT-013)", () => {
  it("calls enter_teleprompter_mode with script {name, content} and rect {x, y, w, h}", async () => {
    Object.defineProperty(window.screen, "availWidth", {
      configurable: true,
      value: 1920,
    });
    Object.defineProperty(window.screen, "availHeight", {
      configurable: true,
      value: 1080,
    });
    useScriptStore.setState({
      script: {
        path: "/scripts/demo.md",
        name: "demo.md",
        content: "# Demo script",
        dirty: false,
      },
    });

    const user = userEvent.setup();
    render(<EditorView />);
    await user.click(screen.getByRole("button", { name: /go live/i }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith(
        "enter_teleprompter_mode",
        expect.objectContaining({
          script: expect.objectContaining({
            name: "demo.md",
            content: "# Demo script",
          }),
          rect: expect.objectContaining({
            x: expect.any(Number),
            y: expect.any(Number),
            w: expect.any(Number),
            h: expect.any(Number),
          }),
        }),
      );
    });
  });

  it("on enter_teleprompter_mode failure, calls alert and mode stays editor", async () => {
    const alertSpy = vi.fn();
    vi.stubGlobal("alert", alertSpy);
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === "enter_teleprompter_mode")
        return Promise.reject("test failure");
      return Promise.resolve(undefined);
    });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const user = userEvent.setup();
    render(<EditorView />);
    await user.click(screen.getByRole("button", { name: /go live/i }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });
    expect(useModeStore.getState().mode).toBe("editor");
    // register_hotkeys should NOT be called
    expect(invokeMock).not.toHaveBeenCalledWith(
      "register_hotkeys",
      expect.anything(),
    );

    errSpy.mockRestore();
    vi.unstubAllGlobals();
  });
});

/* ============================================================
   VAL-EDIT-014: register_hotkeys called AFTER enter_teleprompter_mode succeeds
   ============================================================ */
describe("<EditorView /> — hotkey registration order (VAL-EDIT-014)", () => {
  it("register_hotkeys is called after enter_teleprompter_mode", async () => {
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
    await user.click(screen.getByRole("button", { name: /go live/i }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith(
        "register_hotkeys",
        expect.anything(),
      );
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calls = invokeMock.mock.calls.map((c: any[]) => c[0] as string);
    const enterIdx = calls.indexOf("enter_teleprompter_mode");
    const regIdx = calls.indexOf("register_hotkeys");
    expect(enterIdx).toBeGreaterThanOrEqual(0);
    expect(regIdx).toBeGreaterThan(enterIdx);
  });

  it("playing is set to false after successful Go Live", async () => {
    Object.defineProperty(window.screen, "availWidth", {
      configurable: true,
      value: 1920,
    });
    Object.defineProperty(window.screen, "availHeight", {
      configurable: true,
      value: 1080,
    });
    // Start with playing=true to verify it gets set to false
    useModeStore.setState({ playing: true });

    const user = userEvent.setup();
    render(<EditorView />);
    await user.click(screen.getByRole("button", { name: /go live/i }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith(
        "register_hotkeys",
        expect.anything(),
      );
    });
    expect(useModeStore.getState().playing).toBe(false);
  });

  it("register_hotkeys receives the hotkeys from settings", async () => {
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
    await user.click(screen.getByRole("button", { name: /go live/i }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("register_hotkeys", {
        hotkeys: DEFAULT_SETTINGS.hotkeys,
      });
    });
  });
});
