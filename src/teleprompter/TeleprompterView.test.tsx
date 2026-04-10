import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const {
  currentMonitorMock,
  startDraggingMock,
  startResizeDraggingMock,
  onMovedMock,
  onResizedMock,
  emitMoved,
  emitResized,
  resetNativeWindowListeners,
  hotkeyListeners,
} = vi.hoisted(() => {
  let movedHandler:
    | ((event: {
        payload: { x: number; y: number; toLogical?: (scale: number) => { x: number; y: number } };
      }) => void)
    | null = null;
  let resizedHandler:
    | ((event: {
        payload: {
          width: number;
          height: number;
          toLogical?: (scale: number) => { width: number; height: number };
        };
      }) => void)
    | null = null;

  return {
    currentMonitorMock: vi.fn(),
    startDraggingMock: vi.fn().mockResolvedValue(undefined),
    startResizeDraggingMock: vi.fn().mockResolvedValue(undefined),
    onMovedMock: vi.fn(async (handler) => {
      movedHandler = handler;
      return () => {
        if (movedHandler === handler) movedHandler = null;
      };
    }),
    onResizedMock: vi.fn(async (handler) => {
      resizedHandler = handler;
      return () => {
        if (resizedHandler === handler) resizedHandler = null;
      };
    }),
    emitMoved: (payload: {
      x: number;
      y: number;
      toLogical?: (scale: number) => { x: number; y: number };
    }) => {
      movedHandler?.({ payload });
    },
    emitResized: (payload: {
      width: number;
      height: number;
      toLogical?: (scale: number) => { width: number; height: number };
    }) => {
      resizedHandler?.({ payload });
    },
    resetNativeWindowListeners: () => {
      movedHandler = null;
      resizedHandler = null;
    },
    hotkeyListeners: new Map<string, (event: { payload: unknown }) => void>(),
  };
});

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@tauri-apps/api/window", () => ({
  currentMonitor: currentMonitorMock,
  getCurrentWindow: () => ({
    label: "overlay",
    startDragging: startDraggingMock,
    startResizeDragging: startResizeDraggingMock,
    onMoved: onMovedMock,
    onResized: onResizedMock,
  }),
}));
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async (event: string, handler: (event: { payload: unknown }) => void) => {
    hotkeyListeners.set(event, handler);
    return () => {
      hotkeyListeners.delete(event);
    };
  }),
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
  currentMonitorMock.mockReset();
  currentMonitorMock.mockResolvedValue(null);
  startDraggingMock.mockClear();
  startResizeDraggingMock.mockClear();
  onMovedMock.mockClear();
  onResizedMock.mockClear();
  resetNativeWindowListeners();
  hotkeyListeners.clear();

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

function pointerDown(node: HTMLElement, x = 20, y = 20) {
  const Ptr =
    typeof globalThis.PointerEvent !== "undefined"
      ? globalThis.PointerEvent
      : class extends MouseEvent {
          constructor(type: string, init?: MouseEventInit) {
            super(type, init);
          }
        };

  act(() => {
    node.dispatchEvent(
      new Ptr("pointerdown", {
        bubbles: true,
        clientX: x,
        clientY: y,
        pointerId: 1,
      } as MouseEventInit),
    );
  });
}

describe("<TeleprompterView />", () => {
  it("renders markdown content", () => {
    render(<TeleprompterView />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Title");
  });

  it("shows the hotkey hint when not in edit mode", () => {
    render(<TeleprompterView />);
    expect(screen.getAllByText(/F6 edit/i).length).toBeGreaterThan(0);
  });

  it("does not render edit controls when not in edit mode", () => {
    render(<TeleprompterView />);
    expect(screen.queryByTitle("Lock overlay")).toBeNull();
    expect(screen.queryByTitle("Exit teleprompter")).toBeNull();
  });

  it("renders edit controls when editMode is true", () => {
    useModeStore.setState({ editMode: true });
    const { container } = render(<TeleprompterView />);
    expect(screen.getByTitle("Lock overlay")).toBeInTheDocument();
    expect(screen.getByTitle("Exit teleprompter")).toBeInTheDocument();
    expect(container.querySelector("[data-tauri-drag-region]")).not.toBeNull();
  });

  it("clicking Faster increases scrollSpeed by 5", async () => {
    useModeStore.setState({ editMode: true });
    const user = userEvent.setup();
    render(<TeleprompterView />);
    await user.click(screen.getByTitle("Faster"));
    await Promise.resolve();
    expect(useSettingsStore.getState().settings.scrollSpeed).toBe(45);
  });

  it("clicking Slower decreases scrollSpeed by 5 and clamps at 5", async () => {
    useModeStore.setState({ editMode: true });
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, scrollSpeed: 5 },
      loaded: true,
    });
    const user = userEvent.setup();
    render(<TeleprompterView />);
    await user.click(screen.getByTitle("Slower"));
    await Promise.resolve();
    expect(useSettingsStore.getState().settings.scrollSpeed).toBe(5);
  });

  it("play button toggles playing state", async () => {
    useModeStore.setState({ editMode: true, playing: false });
    const user = userEvent.setup();
    render(<TeleprompterView />);
    await user.click(screen.getByTitle("Play"));
    expect(useModeStore.getState().playing).toBe(true);
  });

  it("arrow navigation pauses playback so a single restart action is correct", () => {
    useModeStore.setState({ editMode: true, playing: true });
    const { container } = render(<TeleprompterView />);
    const scrollable = container.querySelector(".gp-no-scrollbar") as HTMLDivElement;
    Object.defineProperty(scrollable, "scrollTop", {
      value: 120,
      writable: true,
      configurable: true,
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });

    expect(useModeStore.getState().playing).toBe(false);
    expect(scrollable.scrollTop).toBeGreaterThan(120);
  });

  it("clicking Exit unregisters hotkeys, exits teleprompter, and resets mode state", async () => {
    useModeStore.setState({
      editMode: true,
      playing: true,
      mode: "teleprompter",
    });
    const user = userEvent.setup();
    render(<TeleprompterView />);
    await user.click(screen.getByTitle("Exit teleprompter"));
    await Promise.resolve();
    await Promise.resolve();
    const calls = invokeMock.mock.calls.map((call) => call[0]);
    expect(calls).toContain("unregister_hotkeys");
    expect(calls).toContain("exit_teleprompter_mode");
    expect(useModeStore.getState().mode).toBe("editor");
    expect(useModeStore.getState().playing).toBe(false);
    expect(useModeStore.getState().editMode).toBe(false);
  });

  it("sets opacity to 0 when hidden=true", () => {
    useModeStore.setState({ hidden: true });
    const { container } = render(<TeleprompterView />);
    expect((container.firstChild as HTMLElement).style.opacity).toBe("0");
  });

  it("renders the reading line only when enabled", () => {
    const { container, rerender } = render(<TeleprompterView />);
    expect(container.querySelector(".gp-reading-line")).not.toBeNull();

    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, highlightReadingLine: false },
      loaded: true,
    });
    rerender(<TeleprompterView />);
    expect(container.querySelector(".gp-reading-line")).toBeNull();
  });

  it("applies horizontal mirror transform to the scrollable container", () => {
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, mirrorHorizontal: true },
      loaded: true,
    });
    const { container } = render(<TeleprompterView />);
    const scrollable = container.querySelector(".gp-no-scrollbar") as HTMLElement;
    expect(scrollable.style.transform).toContain("scaleX(-1)");
  });
});

describe("<TeleprompterView /> movable viewport", () => {
  it("renders the viewport flush at 0,0 with width and height from settings", () => {
    useSettingsStore.setState({
      settings: {
        ...DEFAULT_SETTINGS,
        overlayX: 120,
        overlayY: 80,
        overlayWidth: 480,
        overlayHeight: 320,
      },
      loaded: true,
    });
    const { container } = render(<TeleprompterView />);
    const viewport = container.querySelector("[data-gp-viewport]") as HTMLElement;
    expect(viewport.style.left).toBe("0px");
    expect(viewport.style.top).toBe("0px");
    expect(viewport.style.width).toBe("480px");
    expect(viewport.style.height).toBe("320px");
  });

  it("uses pixel padding derived from the panel height", () => {
    useSettingsStore.setState({
      settings: {
        ...DEFAULT_SETTINGS,
        overlayX: 0,
        overlayY: 0,
        overlayWidth: 800,
        overlayHeight: 400,
        readingLineOffset: 0.5,
      },
      loaded: true,
    });
    const { container } = render(<TeleprompterView />);
    const scrollable = container.querySelector(".gp-no-scrollbar") as HTMLElement;
    expect(scrollable.style.paddingTop).toBe("200px");
    expect(scrollable.style.paddingBottom).toBe("200px");
    expect(scrollable.style.paddingLeft).toBe("48px");
    expect(scrollable.style.paddingRight).toBe("48px");
  });

  it("snaps the OS window to the persisted rect on mount", async () => {
    useSettingsStore.setState({
      settings: {
        ...DEFAULT_SETTINGS,
        overlayX: 120,
        overlayY: 80,
        overlayWidth: 480,
        overlayHeight: 320,
      },
      loaded: true,
    });
    render(<TeleprompterView />);
    await waitFor(() => {
      expect(
        invokeMock.mock.calls.find((call) => call[0] === "set_overlay_rect"),
      ).toBeDefined();
    });
    expect(
      invokeMock.mock.calls.find((call) => call[0] === "set_overlay_rect")?.[1],
    ).toEqual({ x: 120, y: 80, w: 480, h: 320 });
  });

  it("uses a computed default rect when overlayX/Y are null", async () => {
    useSettingsStore.setState({
      settings: {
        ...DEFAULT_SETTINGS,
        overlayX: null,
        overlayY: null,
      },
      loaded: true,
    });
    const { container } = render(<TeleprompterView />);
    await Promise.resolve();
    const viewport = container.querySelector("[data-gp-viewport]") as HTMLElement;
    expect(parseInt(viewport.style.width, 10)).toBeGreaterThan(200);
    expect(parseInt(viewport.style.height, 10)).toBeGreaterThan(100);
  });

  it("keeps the reading line inside the viewport panel", () => {
    useSettingsStore.setState({
      settings: {
        ...DEFAULT_SETTINGS,
        overlayX: 10,
        overlayY: 10,
      },
      loaded: true,
    });
    const { container } = render(<TeleprompterView />);
    const viewport = container.querySelector("[data-gp-viewport]") as HTMLElement;
    expect(viewport.querySelector(".gp-reading-line")).not.toBeNull();
  });

  it("shows the drag handle and resize grip only in edit mode", () => {
    const { container, rerender } = render(<TeleprompterView />);
    expect(container.querySelector("[data-gp-drag-handle]")).toBeNull();
    expect(container.querySelector("[data-gp-resize-grip]")).toBeNull();

    useModeStore.setState({ editMode: true });
    rerender(<TeleprompterView />);
    expect(container.querySelector("[data-gp-drag-handle]")).not.toBeNull();
    expect(container.querySelector("[data-gp-resize-grip]")).not.toBeNull();
  });

  it("starts native window dragging from the drag handle", () => {
    useModeStore.setState({ editMode: true });
    const { container } = render(<TeleprompterView />);
    const handle = container.querySelector("[data-gp-drag-handle]") as HTMLElement;
    pointerDown(handle, 120, 80);
    expect(startDraggingMock).toHaveBeenCalledTimes(1);
  });

  it("starts native southeast resize from the resize grip", () => {
    useModeStore.setState({ editMode: true });
    const { container } = render(<TeleprompterView />);
    const grip = container.querySelector("[data-gp-resize-grip]") as HTMLElement;
    pointerDown(grip, 460, 310);
    expect(startResizeDraggingMock).toHaveBeenCalledWith("SouthEast");
  });

  it("syncs settings from native window move events", async () => {
    useModeStore.setState({ editMode: true });
    useSettingsStore.setState({
      settings: {
        ...DEFAULT_SETTINGS,
        overlayX: 80,
        overlayY: 60,
        overlayWidth: 360,
        overlayHeight: 240,
      },
      loaded: true,
    });
    render(<TeleprompterView />);

    act(() => {
      emitMoved({
        x: 400,
        y: 280,
        toLogical: () => ({ x: 200, y: 140 }),
      });
    });

    await waitFor(() => {
      expect(useSettingsStore.getState().settings.overlayX).toBe(200);
    });
    expect(useSettingsStore.getState().settings.overlayY).toBe(140);
  });

  it("refreshes monitor bounds after moving so snap presets target the new monitor", async () => {
    useModeStore.setState({ editMode: true });
    useSettingsStore.setState({
      settings: {
        ...DEFAULT_SETTINGS,
        overlayX: 100,
        overlayY: 100,
        overlayWidth: 320,
        overlayHeight: 220,
      },
      loaded: true,
    });
    currentMonitorMock
      .mockResolvedValueOnce({
        scaleFactor: 1,
        workArea: {
          position: { x: 0, y: 0 },
          size: { width: 1920, height: 1080 },
        },
      })
      .mockResolvedValueOnce({
        scaleFactor: 1,
        workArea: {
          position: { x: -1280, y: 0 },
          size: { width: 1280, height: 1024 },
        },
      });

    const user = userEvent.setup();
    render(<TeleprompterView />);

    await waitFor(() => {
      expect(currentMonitorMock).toHaveBeenCalled();
    });

    act(() => {
      emitMoved({
        x: -1180,
        y: 100,
        toLogical: () => ({ x: -1180, y: 100 }),
      });
    });

    await waitFor(() => {
      expect(currentMonitorMock).toHaveBeenCalledTimes(2);
    });

    invokeMock.mockClear();
    await user.click(screen.getByRole("button", { name: "Snap" }));
    await user.click(screen.getByRole("menuitem", { name: "Full screen" }));

    await waitFor(() => {
      expect(
        invokeMock.mock.calls
          .filter((call) => call[0] === "set_overlay_rect")
          .at(-1)?.[1],
      ).toEqual({
        x: -1280,
        y: 0,
        w: 1280,
        h: 1024,
      });
    });
  });

  it("syncs the viewport size from native resize events beyond the initial small window", async () => {
    useModeStore.setState({ editMode: true });
    useSettingsStore.setState({
      settings: {
        ...DEFAULT_SETTINGS,
        overlayX: 100,
        overlayY: 100,
        overlayWidth: 320,
        overlayHeight: 220,
      },
      loaded: true,
    });
    const { container } = render(<TeleprompterView />);
    const viewport = container.querySelector("[data-gp-viewport]") as HTMLElement;

    expect(viewport.style.width).toBe("320px");
    expect(viewport.style.height).toBe("220px");

    act(() => {
      emitResized({
        width: 1640,
        height: 1280,
        toLogical: () => ({ width: 820, height: 640 }),
      });
    });

    await waitFor(() => {
      expect(useSettingsStore.getState().settings.overlayWidth).toBe(820);
    });
    expect(useSettingsStore.getState().settings.overlayHeight).toBe(640);
    expect(viewport.style.width).toBe("820px");
    expect(viewport.style.height).toBe("640px");
  });

  it(
    "coalesces a burst of native resize events into one settings write",
    async () => {
      const realUpdate = useSettingsStore.getState().update;
      const updateSpy = vi.fn(
        async (patch: Partial<typeof DEFAULT_SETTINGS>) => {
          await realUpdate(patch);
        },
      );
      useModeStore.setState({ editMode: true });
      useSettingsStore.setState({
        settings: {
          ...DEFAULT_SETTINGS,
          overlayX: 100,
          overlayY: 100,
          overlayWidth: 320,
          overlayHeight: 220,
        },
        loaded: true,
        update: updateSpy,
      });
      render(<TeleprompterView />);

      // Fire 10 resize events back to back, simulating a per-pixel gesture.
      act(() => {
        for (let i = 1; i <= 10; i++) {
          emitResized({
            width: 400 + i,
            height: 300 + i,
            toLogical: () => ({ width: 400 + i, height: 300 + i }),
          });
        }
      });

      await waitFor(() => {
        expect(useSettingsStore.getState().settings.overlayWidth).toBe(410);
      });
      expect(useSettingsStore.getState().settings.overlayHeight).toBe(310);
      // Exactly one trailing rect write, not one per event.
      const rectWrites = updateSpy.mock.calls.filter((call) => {
        const patch = call[0] as Partial<typeof DEFAULT_SETTINGS>;
        return (
          "overlayX" in patch &&
          "overlayY" in patch &&
          "overlayWidth" in patch &&
          "overlayHeight" in patch
        );
      });
      expect(rectWrites).toHaveLength(1);
      useSettingsStore.setState({ update: realUpdate });
    },
  );

  it("renders a Snap button and opens the snap popover", async () => {
    useModeStore.setState({ editMode: true });
    const user = userEvent.setup();
    const { container } = render(<TeleprompterView />);
    expect(screen.getByRole("button", { name: "Snap" })).toBeInTheDocument();
    expect(container.querySelector("[data-gp-snap-popover]")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Snap" }));
    expect(container.querySelector("[data-gp-snap-popover]")).not.toBeNull();
  });

  it("picking Full screen persists the rect and resizes the OS window", async () => {
    useModeStore.setState({ editMode: true });
    useSettingsStore.setState({
      settings: {
        ...DEFAULT_SETTINGS,
        overlayX: 200,
        overlayY: 200,
        overlayWidth: 500,
        overlayHeight: 500,
      },
      loaded: true,
    });
    const user = userEvent.setup();
    render(<TeleprompterView />);
    await waitFor(() => {
      expect(
        invokeMock.mock.calls.find((call) => call[0] === "set_overlay_rect"),
      ).toBeDefined();
    });
    invokeMock.mockClear();
    await user.click(screen.getByRole("button", { name: "Snap" }));
    await user.click(screen.getByRole("menuitem", { name: "Full screen" }));
    await Promise.resolve();
    await Promise.resolve();
    const settings = useSettingsStore.getState().settings;
    expect(settings.overlayX).toBe(0);
    expect(settings.overlayY).toBe(0);
    expect(settings.overlayWidth).toBe(window.innerWidth);
    expect(settings.overlayHeight).toBe(window.innerHeight);
    expect(
      invokeMock.mock.calls
        .filter((call) => call[0] === "set_overlay_rect")
        .at(-1)?.[1],
    ).toEqual({
      x: 0,
      y: 0,
      w: window.innerWidth,
      h: window.innerHeight,
    });
  });

  it("picking Top right lands flush against the top-right corner", async () => {
    useModeStore.setState({ editMode: true });
    useSettingsStore.setState({
      settings: {
        ...DEFAULT_SETTINGS,
        overlayX: 100,
        overlayY: 100,
        overlayWidth: 400,
        overlayHeight: 300,
      },
      loaded: true,
    });
    const user = userEvent.setup();
    render(<TeleprompterView />);
    await user.click(screen.getByRole("button", { name: "Snap" }));
    await user.click(screen.getByRole("menuitem", { name: "Top right" }));
    await Promise.resolve();
    await Promise.resolve();
    const settings = useSettingsStore.getState().settings;
    expect(settings.overlayY).toBe(0);
    expect((settings.overlayX ?? 0) + settings.overlayWidth).toBe(window.innerWidth);
  });

  it("keeps root pointer-events disabled when not in edit mode and viewport interactive", () => {
    const { container } = render(<TeleprompterView />);
    expect((container.firstChild as HTMLElement).style.pointerEvents).toBe("none");
    expect(
      (container.querySelector("[data-gp-viewport]") as HTMLElement).style.pointerEvents,
    ).toBe("auto");
  });

  it("line-down hotkey pauses playback and scrolls the script", async () => {
    useModeStore.setState({ editMode: false, playing: true });
    const { container } = render(<TeleprompterView />);
    const scrollable = container.querySelector(".gp-no-scrollbar") as HTMLDivElement;
    Object.defineProperty(scrollable, "scrollTop", {
      value: 40,
      writable: true,
      configurable: true,
    });

    await waitFor(() => {
      expect(hotkeyListeners.get("hotkey://line-down")).toBeDefined();
    });

    act(() => {
      hotkeyListeners.get("hotkey://line-down")?.({ payload: undefined });
    });

    expect(useModeStore.getState().playing).toBe(false);
    expect(scrollable.scrollTop).toBeGreaterThan(40);
  });

  it("jump-start hotkey pauses playback and seeks to the top", async () => {
    useModeStore.setState({ editMode: false, playing: true });
    const { container } = render(<TeleprompterView />);
    const scrollable = container.querySelector(".gp-no-scrollbar") as HTMLDivElement;
    Object.defineProperty(scrollable, "scrollTop", {
      value: 320,
      writable: true,
      configurable: true,
    });

    await waitFor(() => {
      expect(hotkeyListeners.get("hotkey://jump-start")).toBeDefined();
    });

    act(() => {
      hotkeyListeners.get("hotkey://jump-start")?.({ payload: undefined });
    });

    expect(useModeStore.getState().playing).toBe(false);
    expect(scrollable.scrollTop).toBe(0);
  });
});
