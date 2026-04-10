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

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { LazyStore } from "@tauri-apps/plugin-store";
import App from "./App";
import { useModeStore } from "@/store/modeStore";
import { useScriptStore } from "@/store/scriptStore";
import { useSettingsStore } from "@/store/settingsStore";
import { DEFAULT_SETTINGS } from "@/types";

const invokeMock = invoke as unknown as ReturnType<typeof vi.fn>;
const listenMock = listen as unknown as ReturnType<typeof vi.fn>;

type Listener = (e: { payload: unknown }) => void;
const capturedListeners = new Map<string, Listener>();

beforeEach(() => {
  capturedListeners.clear();
  invokeMock.mockReset();
  invokeMock.mockImplementation((cmd: string) => {
    if (cmd === "get_live_script") {
      return Promise.resolve({
        path: null,
        name: "Live.md",
        content: "# Live",
        dirty: true,
      });
    }
    return Promise.resolve(undefined);
  });
  listenMock.mockReset();
  listenMock.mockImplementation(async (event: string, cb: Listener) => {
    capturedListeners.set(event, cb);
    return () => {};
  });
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
  (
    window as typeof window & {
      __TAURI_INTERNALS__?: { metadata?: { currentWindow?: { label?: string } } };
    }
  ).__TAURI_INTERNALS__ = {
    metadata: {
      currentWindow: { label: "main" },
    },
  };
  document.body.classList.remove("mode-editor", "mode-teleprompter");
});

async function renderApp() {
  const result = render(<App />);
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
      screen.getByText((_, element) => {
        return element?.textContent === "F6 edit · F7 play · Esc exit";
      }),
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

  it("does not register live listeners in the editor window", async () => {
    await renderApp();
    expect(listenMock.mock.calls.length).toBe(0);
  });

  it("overlay window loads the live script and registers live listeners", async () => {
    (
      window as typeof window & {
        __TAURI_INTERNALS__?: { metadata?: { currentWindow?: { label?: string } } };
      }
    ).__TAURI_INTERNALS__ = {
      metadata: {
        currentWindow: { label: "overlay" },
      },
    };

    await renderApp();

    await waitFor(() => {
      expect(useScriptStore.getState().script.name).toBe("Live.md");
    });
    expect(invokeMock).toHaveBeenCalledWith("get_live_script");
    expect(listenMock.mock.calls.length).toBeGreaterThanOrEqual(7);
  });

  it("overlay does not mount live UI until settings finish loading", async () => {
    (
      window as typeof window & {
        __TAURI_INTERNALS__?: { metadata?: { currentWindow?: { label?: string } } };
      }
    ).__TAURI_INTERNALS__ = {
      metadata: {
        currentWindow: { label: "overlay" },
      },
    };

    useSettingsStore.setState((state) => ({
      ...state,
      loaded: false,
      load: async () => {},
    }));

    await renderApp();

    expect(screen.queryByText("Live.md")).toBeNull();
    expect(listenMock.mock.calls.length).toBe(0);
  });

  // VAL-CROSS-005: Exit flow via hotkey://stop unregisters hotkeys, exits teleprompter, resets mode
  it("overlay hotkey://stop calls unregister then exit and resets state to editor", async () => {
    (
      window as typeof window & {
        __TAURI_INTERNALS__?: { metadata?: { currentWindow?: { label?: string } } };
      }
    ).__TAURI_INTERNALS__ = {
      metadata: {
        currentWindow: { label: "overlay" },
      },
    };
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS },
      loaded: true,
      load: async () => {},
    });
    useModeStore.setState({
      mode: "teleprompter",
      editMode: true,
      playing: true,
      hidden: false,
    });

    await renderApp();
    await waitFor(() => {
      expect(capturedListeners.get("hotkey://stop")).toBeDefined();
    });

    invokeMock.mockClear();
    const cb = capturedListeners.get("hotkey://stop")!;
    await act(async () => {
      cb({ payload: undefined });
      // Wait for the async handler
      await new Promise((r) => setTimeout(r, 10));
    });

    const calls = invokeMock.mock.calls.map((c: string[]) => c[0]);
    expect(calls).toContain("unregister_hotkeys");
    expect(calls).toContain("exit_teleprompter_mode");
    const unregIdx = calls.indexOf("unregister_hotkeys");
    const exitIdx = calls.indexOf("exit_teleprompter_mode");
    expect(unregIdx).toBeLessThan(exitIdx);

    expect(useModeStore.getState().playing).toBe(false);
    expect(useModeStore.getState().editMode).toBe(false);
    expect(useModeStore.getState().mode).toBe("editor");
  });

  // VAL-CROSS-006: mode-changed backend event drives App mode switching
  it("mode-changed event from backend updates mode and editMode in store", async () => {
    (
      window as typeof window & {
        __TAURI_INTERNALS__?: { metadata?: { currentWindow?: { label?: string } } };
      }
    ).__TAURI_INTERNALS__ = {
      metadata: {
        currentWindow: { label: "overlay" },
      },
    };
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS },
      loaded: true,
      load: async () => {},
    });

    await renderApp();
    await waitFor(() => {
      expect(capturedListeners.get("mode-changed")).toBeDefined();
    });

    const cb = capturedListeners.get("mode-changed")!;
    act(() => {
      cb({ payload: { mode: "teleprompter", edit: true } });
    });
    expect(useModeStore.getState().mode).toBe("teleprompter");
    expect(useModeStore.getState().editMode).toBe(true);

    act(() => {
      cb({ payload: { mode: "editor", edit: false } });
    });
    expect(useModeStore.getState().mode).toBe("editor");
    expect(useModeStore.getState().editMode).toBe(false);
  });

  it("overlay hotkey://play-pause callback flips playing state via toggle", async () => {
    (
      window as typeof window & {
        __TAURI_INTERNALS__?: { metadata?: { currentWindow?: { label?: string } } };
      }
    ).__TAURI_INTERNALS__ = {
      metadata: {
        currentWindow: { label: "overlay" },
      },
    };
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS },
      loaded: true,
      load: async () => {},
    });

    await renderApp();
    await waitFor(() => {
      expect(capturedListeners.get("hotkey://play-pause")).toBeDefined();
    });
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
