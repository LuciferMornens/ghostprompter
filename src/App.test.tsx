import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";

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
  const LazyStore = vi.fn().mockImplementation((filename: string) => ({
    filename,
    get,
    set,
    save,
  }));
  return { LazyStore };
});

import { listen } from "@tauri-apps/api/event";
import { LazyStore } from "@tauri-apps/plugin-store";
import App from "./App";
import { useModeStore } from "@/store/modeStore";
import { useScriptStore } from "@/store/scriptStore";
import { useSettingsStore } from "@/store/settingsStore";
import { DEFAULT_SETTINGS } from "@/types";

const listenMock = listen as unknown as ReturnType<typeof vi.fn>;

type Listener = (e: { payload: unknown }) => void;
const capturedListeners = new Map<string, Listener>();

beforeEach(() => {
  capturedListeners.clear();
  listenMock.mockReset();
  listenMock.mockImplementation(async (event: string, cb: Listener) => {
    capturedListeners.set(event, cb);
    return () => {};
  });
  // Reset stores
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
  useSettingsStore.setState({
    settings: { ...DEFAULT_SETTINGS },
    loaded: false,
  });
  document.body.classList.remove("mode-editor", "mode-teleprompter");
});

async function renderApp() {
  const result = render(<App />);
  // Flush all pending microtasks/effects so async state updates from
  // settingsStore.load() and listen() are wrapped inside act().
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
  return result;
}

describe("<App />", () => {
  it("renders editor UI when mode='editor'", async () => {
    await renderApp();
    expect(screen.getByRole("button", { name: "Open" })).toBeInTheDocument();
  });

  it("renders teleprompter view when mode='teleprompter'", async () => {
    useModeStore.setState({ mode: "teleprompter" });
    await renderApp();
    expect(
      screen.getByText("F6 edit · F7 play · Esc exit"),
    ).toBeInTheDocument();
  });

  it("sets body class to mode-editor on mount", async () => {
    await renderApp();
    expect(document.body.classList.contains("mode-editor")).toBe(true);
  });

  it("switches body class to mode-teleprompter when mode changes", async () => {
    await renderApp();
    expect(document.body.classList.contains("mode-editor")).toBe(true);
    await act(async () => {
      useModeStore.setState({ mode: "teleprompter" });
    });
    await waitFor(() => {
      expect(document.body.classList.contains("mode-teleprompter")).toBe(true);
    });
    expect(document.body.classList.contains("mode-editor")).toBe(false);
  });

  it("loads settings on mount (LazyStore is constructed)", async () => {
    await renderApp();
    expect(LazyStore).toHaveBeenCalled();
  });

  it("registers at least 7 event listeners on mount", async () => {
    await renderApp();
    // 1 mode-changed + 7 hotkeys (play-pause, slower, faster, hide, edit-mode, stop)
    // Spec says >= 7
    expect(listenMock.mock.calls.length).toBeGreaterThanOrEqual(7);
  });

  it("hotkey://play-pause callback flips playing state via toggle", async () => {
    await renderApp();
    const cb = capturedListeners.get("hotkey://play-pause");
    expect(cb).toBeDefined();
    expect(useModeStore.getState().playing).toBe(false);
    act(() => {
      cb!({ payload: undefined });
    });
    expect(useModeStore.getState().playing).toBe(true);
    act(() => {
      cb!({ payload: undefined });
    });
    expect(useModeStore.getState().playing).toBe(false);
  });
});
