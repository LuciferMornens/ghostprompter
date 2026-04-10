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

  it("viewport has data-gp-viewport attribute and gp-vp class", () => {
    const { container } = render(<TeleprompterView />);
    const viewport = container.querySelector("[data-gp-viewport]") as HTMLElement;
    expect(viewport).not.toBeNull();
    expect(viewport.classList.contains("gp-vp")).toBe(true);
  });

  it("HUD shows Rolling with active RecDot when playing", () => {
    useModeStore.setState({ playing: true });
    const { container } = render(<TeleprompterView />);
    expect(screen.getByText("Rolling")).toBeInTheDocument();
    const dot = container.querySelector(".gp-rec-dot") as HTMLElement;
    expect(dot).not.toBeNull();
    expect(dot.classList.contains("gp-rec-dot--idle")).toBe(false);
  });

  it("HUD shows Standby with idle RecDot when not playing", () => {
    useModeStore.setState({ playing: false });
    const { container } = render(<TeleprompterView />);
    expect(screen.getByText("Standby")).toBeInTheDocument();
    const dot = container.querySelector(".gp-rec-dot") as HTMLElement;
    expect(dot).not.toBeNull();
    expect(dot.classList.contains("gp-rec-dot--idle")).toBe(true);
  });

  it("HUD shows speed readout with px/s unit", () => {
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, scrollSpeed: 60 },
      loaded: true,
    });
    render(<TeleprompterView />);
    expect(screen.getByText("60")).toBeInTheDocument();
    expect(screen.getByText("px/s")).toBeInTheDocument();
  });

  it("HUD shows script name", () => {
    useScriptStore.setState({
      script: {
        path: null,
        name: "my-script.md",
        content: "test",
        dirty: false,
      },
    });
    render(<TeleprompterView />);
    expect(screen.getByText("my-script.md")).toBeInTheDocument();
  });

  it("does not render HUD elements when hidden=true", () => {
    useModeStore.setState({ hidden: true });
    const { container } = render(<TeleprompterView />);
    expect(container.querySelector(".gp-vp-hud")).toBeNull();
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

// =========================================================================
// VAL-TELE-006: Control cluster renders all buttons in edit mode with toolbar role
// =========================================================================
describe("VAL-TELE-006: Control cluster", () => {
  it("renders all 8 control buttons in edit mode", () => {
    useModeStore.setState({ editMode: true });
    render(<TeleprompterView />);
    expect(screen.getByRole("button", { name: "Slower" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Faster" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Line up" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Line down" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Snap" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lock overlay" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exit teleprompter" })).toBeInTheDocument();
  });

  it("control cluster container has role=toolbar with aria-label", () => {
    useModeStore.setState({ editMode: true });
    render(<TeleprompterView />);
    const toolbar = screen.getByRole("toolbar");
    expect(toolbar).toBeInTheDocument();
    expect(toolbar).toHaveAttribute("aria-label", "Teleprompter controls");
  });

  it("drag region element is present in edit mode", () => {
    useModeStore.setState({ editMode: true });
    const { container } = render(<TeleprompterView />);
    expect(container.querySelector("[data-tauri-drag-region]")).not.toBeNull();
  });

  it("control cluster has gp-vp-cluster class", () => {
    useModeStore.setState({ editMode: true });
    render(<TeleprompterView />);
    const toolbar = screen.getByRole("toolbar");
    expect(toolbar.classList.contains("gp-vp-cluster")).toBe(true);
  });
});

// =========================================================================
// VAL-TELE-007: Controls hidden when not in edit mode
// =========================================================================
describe("VAL-TELE-007: Controls hidden when not editing", () => {
  it("no control buttons render when editMode is false", () => {
    useModeStore.setState({ editMode: false });
    render(<TeleprompterView />);
    expect(screen.queryByRole("button", { name: "Slower" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Faster" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Play" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Line up" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Line down" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Snap" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Lock overlay" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Exit teleprompter" })).toBeNull();
    expect(screen.queryByRole("toolbar")).toBeNull();
  });

  it("root has pointerEvents none while viewport has auto when not editing", () => {
    useModeStore.setState({ editMode: false });
    const { container } = render(<TeleprompterView />);
    expect((container.firstChild as HTMLElement).style.pointerEvents).toBe("none");
    expect(
      (container.querySelector("[data-gp-viewport]") as HTMLElement).style.pointerEvents,
    ).toBe("auto");
  });

  it("hotkey hint F6 edit is shown when not editing and not hidden", () => {
    useModeStore.setState({ editMode: false, hidden: false });
    render(<TeleprompterView />);
    expect(screen.getAllByText(/F6 edit/i).length).toBeGreaterThan(0);
  });
});

// =========================================================================
// VAL-TELE-008: Snap popover opens/closes with grid cells and strip presets
// =========================================================================
describe("VAL-TELE-008: Snap popover", () => {
  it("snap popover is initially closed on mount", () => {
    useModeStore.setState({ editMode: true });
    const { container } = render(<TeleprompterView />);
    expect(container.querySelector("[data-gp-snap-popover]")).toBeNull();
  });

  it("snap popover opens with 9 grid cells and 5 strip presets", async () => {
    useModeStore.setState({ editMode: true });
    const user = userEvent.setup();
    const { container } = render(<TeleprompterView />);
    await user.click(screen.getByRole("button", { name: "Snap" }));

    const popover = container.querySelector("[data-gp-snap-popover]") as HTMLElement;
    expect(popover).not.toBeNull();

    // 9 grid cells
    const gridCells = popover.querySelectorAll(".gp-snap-cell");
    expect(gridCells).toHaveLength(9);

    // 5 strip presets
    const strips = popover.querySelectorAll(".gp-snap-strip");
    expect(strips).toHaveLength(5);
  });

  it("snap popover has role=menu with aria-label", async () => {
    useModeStore.setState({ editMode: true });
    const user = userEvent.setup();
    render(<TeleprompterView />);
    await user.click(screen.getByRole("button", { name: "Snap" }));

    const menu = screen.getByRole("menu");
    expect(menu).toBeInTheDocument();
    expect(menu).toHaveAttribute("aria-label", "Snap presets");
  });

  it("snap popover has gp-snap-popover class", async () => {
    useModeStore.setState({ editMode: true });
    const user = userEvent.setup();
    render(<TeleprompterView />);
    await user.click(screen.getByRole("button", { name: "Snap" }));

    const menu = screen.getByRole("menu");
    expect(menu.classList.contains("gp-snap-popover")).toBe(true);
  });

  it("snap popover closes on Escape", async () => {
    useModeStore.setState({ editMode: true });
    const user = userEvent.setup();
    const { container } = render(<TeleprompterView />);
    await user.click(screen.getByRole("button", { name: "Snap" }));
    expect(container.querySelector("[data-gp-snap-popover]")).not.toBeNull();

    await user.keyboard("{Escape}");
    expect(container.querySelector("[data-gp-snap-popover]")).toBeNull();
  });

  it("snap popover closes on outside click", async () => {
    useModeStore.setState({ editMode: true });
    const user = userEvent.setup();
    const { container } = render(<TeleprompterView />);
    await user.click(screen.getByRole("button", { name: "Snap" }));
    expect(container.querySelector("[data-gp-snap-popover]")).not.toBeNull();

    // Click outside the popover
    act(() => {
      document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });
    expect(container.querySelector("[data-gp-snap-popover]")).toBeNull();
  });
});

// =========================================================================
// VAL-TELE-009: Snap presets persist correct rect and call IPC
// =========================================================================
describe("VAL-TELE-009: Snap preset IPC and active state", () => {
  it("selecting a preset stores the rect in settings and calls set_overlay_rect", async () => {
    useModeStore.setState({ editMode: true });
    useSettingsStore.setState({
      settings: {
        ...DEFAULT_SETTINGS,
        overlayX: 200,
        overlayY: 200,
        overlayWidth: 400,
        overlayHeight: 300,
      },
      loaded: true,
    });
    const user = userEvent.setup();
    render(<TeleprompterView />);
    await waitFor(() => {
      expect(invokeMock.mock.calls.find((c) => c[0] === "set_overlay_rect")).toBeDefined();
    });
    invokeMock.mockClear();

    await user.click(screen.getByRole("button", { name: "Snap" }));
    await user.click(screen.getByRole("menuitem", { name: "Top left" }));
    await Promise.resolve();
    await Promise.resolve();

    const settings = useSettingsStore.getState().settings;
    expect(settings.overlayX).toBe(0);
    expect(settings.overlayY).toBe(0);

    const ipcCall = invokeMock.mock.calls.find((c) => c[0] === "set_overlay_rect");
    expect(ipcCall).toBeDefined();
    expect(ipcCall?.[1]).toMatchObject({ x: 0, y: 0 });
  });

  it("active preset cell gets --active modifier class", async () => {
    useModeStore.setState({ editMode: true });
    // Set the overlay to full screen so "Full screen" is active
    useSettingsStore.setState({
      settings: {
        ...DEFAULT_SETTINGS,
        overlayX: 0,
        overlayY: 0,
        overlayWidth: window.innerWidth,
        overlayHeight: window.innerHeight,
      },
      loaded: true,
    });
    const user = userEvent.setup();
    render(<TeleprompterView />);
    await user.click(screen.getByRole("button", { name: "Snap" }));

    // The "Full screen" strip preset should be active
    const fullScreenStrip = screen.getByRole("menuitem", { name: "Full screen" });
    expect(fullScreenStrip.classList.contains("gp-snap-strip--active")).toBe(true);
  });
});

// =========================================================================
// VAL-TELE-010: Speed controls increment/decrement by 5, clamped [5,500]
// =========================================================================
describe("VAL-TELE-010: Speed controls", () => {
  it("Faster adds 5 to scrollSpeed", async () => {
    useModeStore.setState({ editMode: true });
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, scrollSpeed: 100 },
      loaded: true,
    });
    const user = userEvent.setup();
    render(<TeleprompterView />);
    await user.click(screen.getByRole("button", { name: "Faster" }));
    await Promise.resolve();
    expect(useSettingsStore.getState().settings.scrollSpeed).toBe(105);
  });

  it("Slower subtracts 5 from scrollSpeed", async () => {
    useModeStore.setState({ editMode: true });
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, scrollSpeed: 100 },
      loaded: true,
    });
    const user = userEvent.setup();
    render(<TeleprompterView />);
    await user.click(screen.getByRole("button", { name: "Slower" }));
    await Promise.resolve();
    expect(useSettingsStore.getState().settings.scrollSpeed).toBe(95);
  });

  it("speed does not go below 5", async () => {
    useModeStore.setState({ editMode: true });
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, scrollSpeed: 5 },
      loaded: true,
    });
    const user = userEvent.setup();
    render(<TeleprompterView />);
    await user.click(screen.getByRole("button", { name: "Slower" }));
    await Promise.resolve();
    expect(useSettingsStore.getState().settings.scrollSpeed).toBe(5);
  });

  it("speed does not exceed 500", async () => {
    useModeStore.setState({ editMode: true });
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, scrollSpeed: 500 },
      loaded: true,
    });
    const user = userEvent.setup();
    render(<TeleprompterView />);
    await user.click(screen.getByRole("button", { name: "Faster" }));
    await Promise.resolve();
    expect(useSettingsStore.getState().settings.scrollSpeed).toBe(500);
  });

  it("speed readout updates live after clicking Faster", async () => {
    useModeStore.setState({ editMode: true });
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, scrollSpeed: 40 },
      loaded: true,
    });
    const user = userEvent.setup();
    render(<TeleprompterView />);

    // Cluster speed readout initially shows 40
    const speedValue = screen.getAllByText("40");
    expect(speedValue.length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Faster" }));
    await Promise.resolve();

    // Now shows 45
    expect(screen.getAllByText("45").length).toBeGreaterThan(0);
  });
});

// =========================================================================
// VAL-TELE-011: Play/Pause toggle with icon swap, spacebar in edit mode only
// =========================================================================
describe("VAL-TELE-011: Play/Pause", () => {
  it("play button toggles modeStore.playing", async () => {
    useModeStore.setState({ editMode: true, playing: false });
    const user = userEvent.setup();
    render(<TeleprompterView />);
    await user.click(screen.getByRole("button", { name: "Play" }));
    expect(useModeStore.getState().playing).toBe(true);
  });

  it("shows ▶ when paused and ⏸ when playing", () => {
    useModeStore.setState({ editMode: true, playing: false });
    const { rerender } = render(<TeleprompterView />);
    // When paused: Play button with ▶
    const playBtn = screen.getByRole("button", { name: "Play" });
    expect(playBtn.textContent).toContain("▶");

    useModeStore.setState({ playing: true });
    rerender(<TeleprompterView />);
    // When playing: Pause button with ⏸
    const pauseBtn = screen.getByRole("button", { name: "Pause" });
    expect(pauseBtn.textContent).toContain("⏸");
  });

  it("spacebar toggles playing in edit mode", () => {
    useModeStore.setState({ editMode: true, playing: false });
    render(<TeleprompterView />);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: " ", bubbles: true }),
      );
    });
    expect(useModeStore.getState().playing).toBe(true);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: " ", bubbles: true }),
      );
    });
    expect(useModeStore.getState().playing).toBe(false);
  });

  it("spacebar does not toggle playing when not in edit mode", () => {
    useModeStore.setState({ editMode: false, playing: false });
    render(<TeleprompterView />);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: " ", bubbles: true }),
      );
    });
    expect(useModeStore.getState().playing).toBe(false);
  });
});

// =========================================================================
// VAL-TELE-012: Line up/down scrolls content and pauses playback
// =========================================================================
describe("VAL-TELE-012: Line navigation", () => {
  it("Line down increases scrollTop by fontSize × lineHeight × 1.5 and pauses", async () => {
    useModeStore.setState({ editMode: true, playing: false });
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, fontSize: 42, lineHeight: 1.6 },
      loaded: true,
    });
    const user = userEvent.setup();
    const { container } = render(<TeleprompterView />);
    const scrollable = container.querySelector(".gp-no-scrollbar") as HTMLDivElement;
    Object.defineProperty(scrollable, "scrollTop", {
      value: 100,
      writable: true,
      configurable: true,
    });

    await user.click(screen.getByRole("button", { name: "Line down" }));

    // fontSize(42) × lineHeight(1.6) × 1.5 = 100.8; 100 + 100.8 = 200.8
    expect(scrollable.scrollTop).toBeCloseTo(200.8, 0);
  });

  it("Line up decreases scrollTop by fontSize × lineHeight × 1.5", async () => {
    useModeStore.setState({ editMode: true, playing: false });
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, fontSize: 42, lineHeight: 1.6 },
      loaded: true,
    });
    const user = userEvent.setup();
    const { container } = render(<TeleprompterView />);
    const scrollable = container.querySelector(".gp-no-scrollbar") as HTMLDivElement;
    Object.defineProperty(scrollable, "scrollTop", {
      value: 200,
      writable: true,
      configurable: true,
    });

    await user.click(screen.getByRole("button", { name: "Line up" }));

    // 200 - 100.8 = 99.2
    expect(scrollable.scrollTop).toBeCloseTo(99.2, 0);
  });

  it("Line down pauses playback when playing", async () => {
    useModeStore.setState({ editMode: true, playing: true });
    const user = userEvent.setup();
    render(<TeleprompterView />);

    await user.click(screen.getByRole("button", { name: "Line down" }));

    expect(useModeStore.getState().playing).toBe(false);
  });

  it("ArrowDown scrolls in edit mode", () => {
    useModeStore.setState({ editMode: true, playing: true });
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, fontSize: 42, lineHeight: 1.6 },
      loaded: true,
    });
    const { container } = render(<TeleprompterView />);
    const scrollable = container.querySelector(".gp-no-scrollbar") as HTMLDivElement;
    Object.defineProperty(scrollable, "scrollTop", {
      value: 50,
      writable: true,
      configurable: true,
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });

    expect(scrollable.scrollTop).toBeGreaterThan(50);
    expect(useModeStore.getState().playing).toBe(false);
  });

  it("ArrowUp scrolls in edit mode", () => {
    useModeStore.setState({ editMode: true, playing: true });
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, fontSize: 42, lineHeight: 1.6 },
      loaded: true,
    });
    const { container } = render(<TeleprompterView />);
    const scrollable = container.querySelector(".gp-no-scrollbar") as HTMLDivElement;
    Object.defineProperty(scrollable, "scrollTop", {
      value: 200,
      writable: true,
      configurable: true,
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    });

    expect(scrollable.scrollTop).toBeLessThan(200);
    expect(useModeStore.getState().playing).toBe(false);
  });

  it("arrow keys are ignored when not in edit mode", () => {
    useModeStore.setState({ editMode: false, playing: true });
    const { container } = render(<TeleprompterView />);
    const scrollable = container.querySelector(".gp-no-scrollbar") as HTMLDivElement;
    Object.defineProperty(scrollable, "scrollTop", {
      value: 100,
      writable: true,
      configurable: true,
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });

    expect(scrollable.scrollTop).toBe(100);
    expect(useModeStore.getState().playing).toBe(true);
  });

  it("arrow keys are ignored on editable elements (contentEditable, input, textarea, select)", () => {
    useModeStore.setState({ editMode: true, playing: false });
    const { container } = render(<TeleprompterView />);
    const scrollable = container.querySelector(".gp-no-scrollbar") as HTMLDivElement;
    Object.defineProperty(scrollable, "scrollTop", {
      value: 100,
      writable: true,
      configurable: true,
    });

    // Simulate keydown event originating from an input element
    const input = document.createElement("input");
    document.body.appendChild(input);
    act(() => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
      );
    });
    expect(scrollable.scrollTop).toBe(100);

    // Simulate keydown originating from a textarea
    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    act(() => {
      textarea.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
      );
    });
    expect(scrollable.scrollTop).toBe(100);

    document.body.removeChild(input);
    document.body.removeChild(textarea);
  });
});

// =========================================================================
// VAL-TELE-013: Exit button unregisters hotkeys, exits mode, resets state
// =========================================================================
describe("VAL-TELE-013: Exit flow", () => {
  it("exit calls unregister_hotkeys then exit_teleprompter_mode in order", async () => {
    useModeStore.setState({ editMode: true, playing: true, mode: "teleprompter" });
    const user = userEvent.setup();
    render(<TeleprompterView />);

    await user.click(screen.getByRole("button", { name: "Exit teleprompter" }));
    await Promise.resolve();
    await Promise.resolve();

    const calls = invokeMock.mock.calls.map((call) => call[0]);
    const unregIdx = calls.indexOf("unregister_hotkeys");
    const exitIdx = calls.indexOf("exit_teleprompter_mode");
    expect(unregIdx).toBeGreaterThanOrEqual(0);
    expect(exitIdx).toBeGreaterThanOrEqual(0);
    expect(unregIdx).toBeLessThan(exitIdx);
  });

  it("exit sets playing=false, editMode=false, mode=editor", async () => {
    useModeStore.setState({ editMode: true, playing: true, mode: "teleprompter" });
    const user = userEvent.setup();
    render(<TeleprompterView />);

    await user.click(screen.getByRole("button", { name: "Exit teleprompter" }));
    await Promise.resolve();
    await Promise.resolve();

    expect(useModeStore.getState().playing).toBe(false);
    expect(useModeStore.getState().editMode).toBe(false);
    expect(useModeStore.getState().mode).toBe("editor");
  });
});

// =========================================================================
// VAL-TELE-014: Drag handle calls startDragging in edit mode only
// =========================================================================
describe("VAL-TELE-014: Drag handle", () => {
  it("calls startDragging on pointerdown in edit mode", () => {
    useModeStore.setState({ editMode: true });
    const { container } = render(<TeleprompterView />);
    const handle = container.querySelector("[data-gp-drag-handle]") as HTMLElement;
    pointerDown(handle, 120, 80);
    expect(startDraggingMock).toHaveBeenCalledTimes(1);
  });

  it("drag handle has aria-label='Drag to move', role=button, tabIndex=-1", () => {
    useModeStore.setState({ editMode: true });
    const { container } = render(<TeleprompterView />);
    const handle = container.querySelector("[data-gp-drag-handle]") as HTMLElement;
    expect(handle).toHaveAttribute("aria-label", "Drag to move");
    expect(handle).toHaveAttribute("role", "button");
    expect(handle.tabIndex).toBe(-1);
  });

  it("drag handle is not present when not in edit mode", () => {
    useModeStore.setState({ editMode: false });
    const { container } = render(<TeleprompterView />);
    expect(container.querySelector("[data-gp-drag-handle]")).toBeNull();
  });

  it("startDragging is not called when not in edit mode (no handle rendered)", () => {
    useModeStore.setState({ editMode: false });
    render(<TeleprompterView />);
    // Handle doesn't exist, so no click possible
    expect(startDraggingMock).not.toHaveBeenCalled();
  });
});

// =========================================================================
// VAL-TELE-015: All 8 resize handles present in edit mode with correct directions
// =========================================================================
describe("VAL-TELE-015: Resize handles", () => {
  it("renders 4 edge and 4 corner resize handles in edit mode", () => {
    useModeStore.setState({ editMode: true });
    const { container } = render(<TeleprompterView />);

    // 4 edges: n, s, e, w
    expect(container.querySelector(".gp-vp-edge--n")).not.toBeNull();
    expect(container.querySelector(".gp-vp-edge--s")).not.toBeNull();
    expect(container.querySelector(".gp-vp-edge--e")).not.toBeNull();
    expect(container.querySelector(".gp-vp-edge--w")).not.toBeNull();

    // 4 corners: nw, ne, sw, se
    expect(container.querySelector(".gp-vp-corner--nw")).not.toBeNull();
    expect(container.querySelector(".gp-vp-corner--ne")).not.toBeNull();
    expect(container.querySelector(".gp-vp-corner--sw")).not.toBeNull();
    expect(container.querySelector(".gp-vp-corner--se")).not.toBeNull();
  });

  it("each edge/corner calls startResizeDragging with the correct direction", () => {
    useModeStore.setState({ editMode: true });
    const { container } = render(<TeleprompterView />);

    const edgeMap: Array<[string, string]> = [
      [".gp-vp-edge--n", "North"],
      [".gp-vp-edge--s", "South"],
      [".gp-vp-edge--e", "East"],
      [".gp-vp-edge--w", "West"],
    ];
    const cornerMap: Array<[string, string]> = [
      [".gp-vp-corner--nw", "NorthWest"],
      [".gp-vp-corner--ne", "NorthEast"],
      [".gp-vp-corner--sw", "SouthWest"],
      [".gp-vp-corner--se", "SouthEast"],
    ];

    for (const [selector, direction] of [...edgeMap, ...cornerMap]) {
      startResizeDraggingMock.mockClear();
      const el = container.querySelector(selector) as HTMLElement;
      pointerDown(el);
      expect(startResizeDraggingMock).toHaveBeenCalledWith(direction);
    }
  });

  it("SE grip has aria-label='Resize'", () => {
    useModeStore.setState({ editMode: true });
    const { container } = render(<TeleprompterView />);
    const grip = container.querySelector("[data-gp-resize-grip]") as HTMLElement;
    expect(grip).toHaveAttribute("aria-label", "Resize");
  });

  it("resize handles are absent when not in edit mode", () => {
    useModeStore.setState({ editMode: false });
    const { container } = render(<TeleprompterView />);

    expect(container.querySelector(".gp-vp-edge--n")).toBeNull();
    expect(container.querySelector(".gp-vp-edge--s")).toBeNull();
    expect(container.querySelector(".gp-vp-edge--e")).toBeNull();
    expect(container.querySelector(".gp-vp-edge--w")).toBeNull();
    expect(container.querySelector(".gp-vp-corner--nw")).toBeNull();
    expect(container.querySelector(".gp-vp-corner--ne")).toBeNull();
    expect(container.querySelector(".gp-vp-corner--sw")).toBeNull();
    expect(container.querySelector(".gp-vp-corner--se")).toBeNull();
    expect(container.querySelector("[data-gp-resize-grip]")).toBeNull();
  });
});

// =========================================================================
// VAL-TELE-020: Hotkey events subscribed and cleaned up on unmount
// =========================================================================
describe("VAL-TELE-020: Hotkey event subscriptions", () => {
  it("subscribes to line-up, line-down, jump-start, jump-end hotkeys", async () => {
    render(<TeleprompterView />);
    await waitFor(() => {
      expect(hotkeyListeners.get("hotkey://line-up")).toBeDefined();
      expect(hotkeyListeners.get("hotkey://line-down")).toBeDefined();
      expect(hotkeyListeners.get("hotkey://jump-start")).toBeDefined();
      expect(hotkeyListeners.get("hotkey://jump-end")).toBeDefined();
    });
  });

  it("line-up hotkey pauses playback and scrolls backward", async () => {
    useModeStore.setState({ editMode: false, playing: true });
    const { container } = render(<TeleprompterView />);
    const scrollable = container.querySelector(".gp-no-scrollbar") as HTMLDivElement;
    Object.defineProperty(scrollable, "scrollTop", {
      value: 200,
      writable: true,
      configurable: true,
    });

    await waitFor(() => {
      expect(hotkeyListeners.get("hotkey://line-up")).toBeDefined();
    });

    act(() => {
      hotkeyListeners.get("hotkey://line-up")?.({ payload: undefined });
    });

    expect(useModeStore.getState().playing).toBe(false);
    expect(scrollable.scrollTop).toBeLessThan(200);
  });

  it("jump-end hotkey pauses playback and seeks to the bottom", async () => {
    useModeStore.setState({ editMode: false, playing: true });
    const { container } = render(<TeleprompterView />);
    const scrollable = container.querySelector(".gp-no-scrollbar") as HTMLDivElement;
    Object.defineProperty(scrollable, "scrollHeight", {
      value: 2000,
      writable: false,
      configurable: true,
    });
    Object.defineProperty(scrollable, "scrollTop", {
      value: 40,
      writable: true,
      configurable: true,
    });

    await waitFor(() => {
      expect(hotkeyListeners.get("hotkey://jump-end")).toBeDefined();
    });

    act(() => {
      hotkeyListeners.get("hotkey://jump-end")?.({ payload: undefined });
    });

    expect(useModeStore.getState().playing).toBe(false);
    expect(scrollable.scrollTop).toBe(2000);
  });

  it("all hotkey listeners are unregistered on unmount", async () => {
    const { unmount } = render(<TeleprompterView />);

    await waitFor(() => {
      expect(hotkeyListeners.get("hotkey://line-up")).toBeDefined();
      expect(hotkeyListeners.get("hotkey://line-down")).toBeDefined();
      expect(hotkeyListeners.get("hotkey://jump-start")).toBeDefined();
      expect(hotkeyListeners.get("hotkey://jump-end")).toBeDefined();
    });

    unmount();

    // Cleanup is async (promises resolve after unmount)
    await waitFor(() => {
      expect(hotkeyListeners.get("hotkey://line-up")).toBeUndefined();
      expect(hotkeyListeners.get("hotkey://line-down")).toBeUndefined();
      expect(hotkeyListeners.get("hotkey://jump-start")).toBeUndefined();
      expect(hotkeyListeners.get("hotkey://jump-end")).toBeUndefined();
    });
  });
});

// =========================================================================
// VAL-TELE-021: Native move/resize events sync to settings with coalescing
// =========================================================================
describe("VAL-TELE-021: Native sync with coalescing", () => {
  it("onMoved updates overlayX/Y in settings", async () => {
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
        x: 600,
        y: 400,
        toLogical: () => ({ x: 300, y: 200 }),
      });
    });

    await waitFor(() => {
      expect(useSettingsStore.getState().settings.overlayX).toBe(300);
    });
    expect(useSettingsStore.getState().settings.overlayY).toBe(200);
  });

  it("onResized updates overlayWidth/Height in settings", async () => {
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

    act(() => {
      emitResized({
        width: 1200,
        height: 900,
        toLogical: () => ({ width: 600, height: 450 }),
      });
    });

    await waitFor(() => {
      expect(useSettingsStore.getState().settings.overlayWidth).toBe(600);
    });
    expect(useSettingsStore.getState().settings.overlayHeight).toBe(450);
    const viewport = container.querySelector("[data-gp-viewport]") as HTMLElement;
    expect(viewport.style.width).toBe("600px");
    expect(viewport.style.height).toBe("450px");
  });

  it("coalesces a burst of move events into one settings write", async () => {
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
        overlayWidth: 400,
        overlayHeight: 300,
      },
      loaded: true,
      update: updateSpy,
    });
    render(<TeleprompterView />);

    act(() => {
      for (let i = 1; i <= 10; i++) {
        emitMoved({
          x: 100 + i * 10,
          y: 100 + i * 5,
          toLogical: () => ({ x: 100 + i * 10, y: 100 + i * 5 }),
        });
      }
    });

    await waitFor(() => {
      expect(useSettingsStore.getState().settings.overlayX).toBe(200);
    });
    expect(useSettingsStore.getState().settings.overlayY).toBe(150);

    // Only one trailing rect write, not one per event
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
  });
});
