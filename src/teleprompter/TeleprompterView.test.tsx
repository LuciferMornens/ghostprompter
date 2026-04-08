import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
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
import { TeleprompterView } from "./TeleprompterView";
import { useModeStore } from "@/store/modeStore";
import { useScriptStore } from "@/store/scriptStore";
import { useSettingsStore } from "@/store/settingsStore";
import { DEFAULT_SETTINGS } from "@/types";

const invokeMock = invoke as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  invokeMock.mockReset();
  invokeMock.mockResolvedValue(undefined);
  useModeStore.setState({
    mode: "teleprompter",
    editMode: false,
    playing: false,
    hidden: false,
  });
  useScriptStore.setState({
    script: {
      path: null,
      name: "s.md",
      content: "# Title\n\nbody",
      dirty: false,
    },
  });
  useSettingsStore.setState({
    settings: { ...DEFAULT_SETTINGS, scrollSpeed: 40 },
    loaded: true,
  });
});

describe("<TeleprompterView />", () => {
  it("renders markdown content", () => {
    render(<TeleprompterView />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("Title");
  });

  it("shows hint text when not in edit mode", () => {
    render(<TeleprompterView />);
    expect(
      screen.getByText("F6 edit · F7 play · Esc exit"),
    ).toBeInTheDocument();
  });

  it("does not render edit-mode controls when not in edit mode", () => {
    render(<TeleprompterView />);
    expect(screen.queryByRole("button", { name: "Lock" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Exit" })).toBeNull();
    expect(screen.queryByRole("button", { name: "+" })).toBeNull();
    expect(screen.queryByRole("button", { name: "−" })).toBeNull();
  });

  it("renders edit-mode controls when editMode is true", () => {
    useModeStore.setState({ editMode: true });
    const { container } = render(<TeleprompterView />);
    expect(screen.getByRole("button", { name: "Lock" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "−" })).toBeInTheDocument();
    // Drag region present
    const drag = container.querySelector("[data-tauri-drag-region]");
    expect(drag).not.toBeNull();
  });

  it("clicking + increases scrollSpeed by 5", async () => {
    useModeStore.setState({ editMode: true });
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, scrollSpeed: 40 },
      loaded: true,
    });
    const user = userEvent.setup();
    render(<TeleprompterView />);
    await user.click(screen.getByRole("button", { name: "+" }));
    // Wait microtask
    await Promise.resolve();
    expect(useSettingsStore.getState().settings.scrollSpeed).toBe(45);
  });

  it("clicking − decreases scrollSpeed by 5 (clamped at 5)", async () => {
    useModeStore.setState({ editMode: true });
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, scrollSpeed: 40 },
      loaded: true,
    });
    const user = userEvent.setup();
    render(<TeleprompterView />);
    await user.click(screen.getByRole("button", { name: "−" }));
    await Promise.resolve();
    expect(useSettingsStore.getState().settings.scrollSpeed).toBe(35);
  });

  it("− clamps scrollSpeed to a minimum of 5", async () => {
    useModeStore.setState({ editMode: true });
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, scrollSpeed: 5 },
      loaded: true,
    });
    const user = userEvent.setup();
    render(<TeleprompterView />);
    await user.click(screen.getByRole("button", { name: "−" }));
    await Promise.resolve();
    expect(useSettingsStore.getState().settings.scrollSpeed).toBe(5);
  });

  it("play/pause button toggles the playing state", async () => {
    useModeStore.setState({ editMode: true, playing: false });
    const user = userEvent.setup();
    render(<TeleprompterView />);
    // Initially shows ▶
    const playBtn = screen.getByRole("button", { name: "▶" });
    await user.click(playBtn);
    expect(useModeStore.getState().playing).toBe(true);
  });

  it("clicking Exit unregisters hotkeys, exits teleprompter, resets state", async () => {
    useModeStore.setState({
      editMode: true,
      playing: true,
      mode: "teleprompter",
    });
    const user = userEvent.setup();
    render(<TeleprompterView />);
    await user.click(screen.getByRole("button", { name: "Exit" }));
    // Wait for both invokes to settle
    await Promise.resolve();
    await Promise.resolve();
    const calls = invokeMock.mock.calls.map((c) => c[0]);
    expect(calls).toContain("unregister_hotkeys");
    expect(calls).toContain("exit_teleprompter_mode");
    expect(useModeStore.getState().mode).toBe("editor");
    expect(useModeStore.getState().playing).toBe(false);
    expect(useModeStore.getState().editMode).toBe(false);
  });

  it("when hidden=true, container opacity is 0", () => {
    useModeStore.setState({ hidden: true });
    const { container } = render(<TeleprompterView />);
    const root = container.firstChild as HTMLElement;
    expect(root.style.opacity).toBe("0");
  });

  it("renders reading line when settings.highlightReadingLine=true", () => {
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, highlightReadingLine: true },
      loaded: true,
    });
    const { container } = render(<TeleprompterView />);
    expect(container.querySelector(".gp-reading-line")).not.toBeNull();
  });

  it("does not render reading line when highlightReadingLine=false", () => {
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, highlightReadingLine: false },
      loaded: true,
    });
    const { container } = render(<TeleprompterView />);
    expect(container.querySelector(".gp-reading-line")).toBeNull();
  });

  it("scrollable container transform contains scaleX(-1) when mirrorHorizontal=true", () => {
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, mirrorHorizontal: true },
      loaded: true,
    });
    const { container } = render(<TeleprompterView />);
    // The scrollable container is the one that wraps the markdown preview
    const scrollable = container.querySelector(".gp-no-scrollbar") as HTMLElement;
    expect(scrollable).not.toBeNull();
    expect(scrollable.style.transform).toContain("scaleX(-1)");
  });

  it("HUD shows a REC dot that is active only when playing=true", () => {
    useModeStore.setState({ editMode: true, playing: false });
    const { container, rerender } = render(<TeleprompterView />);
    // idle state present
    expect(container.querySelector(".gp-rec-dot--idle")).not.toBeNull();

    act(() => {
      useModeStore.setState({ playing: true });
    });
    rerender(<TeleprompterView />);
    expect(container.querySelector(".gp-rec-dot")).not.toBeNull();
    // After rerender with playing=true, no element should have the idle modifier
    expect(container.querySelector(".gp-rec-dot--idle")).toBeNull();
  });

  it("HUD shows the current scroll speed in px/s", () => {
    useModeStore.setState({ editMode: true });
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, scrollSpeed: 73 },
      loaded: true,
    });
    render(<TeleprompterView />);
    // Shown in both the top-right HUD and the edit-mode control cluster.
    const matches = screen.getAllByText("73");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});
