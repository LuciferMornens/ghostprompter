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
import { applyMoveDelta } from "./viewportMath";
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

describe("<TeleprompterView /> movable viewport", () => {
  it("renders a data-gp-viewport panel with width/height from settings and is flush to 0,0 inside the OS window", () => {
    // The OS window is sized to match the rect via `set_overlay_rect`,
    // so the DOM panel lives at 0,0 inside that window. width/height still
    // drive the panel size for layout.
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
    const vp = container.querySelector(
      "[data-gp-viewport]",
    ) as HTMLElement | null;
    expect(vp).not.toBeNull();
    expect(vp!.style.left).toBe("0px");
    expect(vp!.style.top).toBe("0px");
    expect(vp!.style.width).toBe("480px");
    expect(vp!.style.height).toBe("320px");
  });

  it("scrollable content uses pixel padding derived from the actual panel height, not percentages (which resolve against width)", () => {
    // Regression: the scrollable content inside the viewport panel used
    // `paddingTop/Bottom: 50%`, but CSS block padding percentages resolve
    // against the *containing block's width*, not its height. On a
    // non-square panel that bunches the text away from the reading line.
    // The fix computes paddingTop/Bottom in pixels from rect.h and the
    // current readingLineOffset so the first line always sits on the bar.
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
    const scrollable = container.querySelector(
      ".gp-no-scrollbar",
    ) as HTMLElement;
    expect(scrollable).not.toBeNull();
    // 50% of 400 = 200px top and bottom — not 50% of 800 width.
    expect(scrollable.style.paddingTop).toBe("200px");
    expect(scrollable.style.paddingBottom).toBe("200px");
    // Horizontal gutters scale with width.
    expect(scrollable.style.paddingLeft).toBe("48px");
    expect(scrollable.style.paddingRight).toBe("48px");
  });

  it("scrollable content padding tracks a non-centered readingLineOffset", () => {
    useSettingsStore.setState({
      settings: {
        ...DEFAULT_SETTINGS,
        overlayX: 0,
        overlayY: 0,
        overlayWidth: 600,
        overlayHeight: 500,
        readingLineOffset: 0.3,
      },
      loaded: true,
    });
    const { container } = render(<TeleprompterView />);
    const scrollable = container.querySelector(
      ".gp-no-scrollbar",
    ) as HTMLElement;
    // 0.3 * 500 = 150 top, (1-0.3) * 500 = 350 bottom
    expect(scrollable.style.paddingTop).toBe("150px");
    expect(scrollable.style.paddingBottom).toBe("350px");
  });

  it("snaps the OS window to the persisted rect on mount via set_overlay_rect", async () => {
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
    await Promise.resolve();
    await Promise.resolve();
    const call = invokeMock.mock.calls.find(
      (c) => c[0] === "set_overlay_rect",
    );
    expect(call).toBeDefined();
    expect(call?.[1]).toEqual({ x: 120, y: 80, w: 480, h: 320 });
  });

  it("uses a computed default rect when overlayX/Y are null and persists it", async () => {
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
    const vp = container.querySelector(
      "[data-gp-viewport]",
    ) as HTMLElement | null;
    expect(vp).not.toBeNull();
    // Non-empty positive numeric inline sizes; position is flush.
    expect(vp!.style.left).toBe("0px");
    expect(vp!.style.top).toBe("0px");
    expect(parseInt(vp!.style.width, 10)).toBeGreaterThan(200);
    expect(parseInt(vp!.style.height, 10)).toBeGreaterThan(100);
  });

  it("reading line is a descendant of the viewport panel", () => {
    useSettingsStore.setState({
      settings: {
        ...DEFAULT_SETTINGS,
        highlightReadingLine: true,
        overlayX: 10,
        overlayY: 10,
      },
      loaded: true,
    });
    const { container } = render(<TeleprompterView />);
    const vp = container.querySelector(
      "[data-gp-viewport]",
    ) as HTMLElement | null;
    expect(vp).not.toBeNull();
    expect(vp!.querySelector(".gp-reading-line")).not.toBeNull();
  });

  it("does not render the drag handle when not in edit mode", () => {
    useModeStore.setState({ editMode: false });
    const { container } = render(<TeleprompterView />);
    expect(container.querySelector("[data-gp-drag-handle]")).toBeNull();
  });

  it("renders drag handle and resize grip in edit mode", () => {
    useModeStore.setState({ editMode: true });
    const { container } = render(<TeleprompterView />);
    expect(container.querySelector("[data-gp-drag-handle]")).not.toBeNull();
    expect(container.querySelector("[data-gp-resize-grip]")).not.toBeNull();
  });

  it("drag works when pointermove/pointerup are dispatched on window (not bubbling through panel)", async () => {
    // Regression: the old implementation called setPointerCapture on the drag
    // handle child and relied on onPointerMove on the parent panel to update
    // dragRect. Pointer capture routes move/up events to the capture target,
    // so the parent handler never fires and drag silently breaks. The fix
    // installs window-level listeners on pointerdown. This test asserts that
    // window-dispatched events alone are enough to complete a drag, with
    // pointer-capture methods also stubbed so any accidental reliance on
    // them would fail.
    const proto = HTMLElement.prototype;
    const prevCapture = proto.setPointerCapture;
    const prevRelease = proto.releasePointerCapture;
    proto.setPointerCapture = vi.fn();
    proto.releasePointerCapture = vi.fn();
    try {
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
      const updateSpy = vi.spyOn(useSettingsStore.getState(), "update");
      const { container } = render(<TeleprompterView />);
      const handle = container.querySelector(
        "[data-gp-drag-handle]",
      ) as HTMLElement;
      const screenSize = { w: window.innerWidth, h: window.innerHeight };
      const startRect = { x: 80, y: 60, w: 360, h: 240 };

      const Ptr =
        typeof globalThis.PointerEvent !== "undefined"
          ? globalThis.PointerEvent
          : class extends MouseEvent {
              constructor(type: string, init?: MouseEventInit) {
                super(type, init);
              }
            };
      const pe = (type: string, x: number, y: number) =>
        new Ptr(type, {
          bubbles: true,
          clientX: x,
          clientY: y,
          pointerId: 7,
        } as MouseEventInit);

      act(() => {
        handle.dispatchEvent(pe("pointerdown", 120, 80));
      });
      // These events go straight to window (simulating pointer capture
      // routing that bypasses the panel subtree). The window-level
      // listeners installed by beginDrag must handle them.
      act(() => {
        window.dispatchEvent(pe("pointermove", 220, 140));
        window.dispatchEvent(pe("pointerup", 220, 140));
      });

      await Promise.resolve();
      const expected = applyMoveDelta(startRect, 100, 60, screenSize);
      const dragPatch = updateSpy.mock.calls
        .map((c) => c[0] as Record<string, unknown>)
        .find(
          (p) =>
            typeof p.overlayX === "number" &&
            typeof p.overlayY === "number" &&
            typeof p.overlayWidth === "number" &&
            typeof p.overlayHeight === "number" &&
            p.overlayX !== startRect.x,
        );
      expect(dragPatch).toBeDefined();
      expect(dragPatch).toMatchObject({
        overlayX: expected.x,
        overlayY: expected.y,
        overlayWidth: expected.w,
        overlayHeight: expected.h,
      });
    } finally {
      proto.setPointerCapture = prevCapture;
      proto.releasePointerCapture = prevRelease;
    }
  });

  it("persists final drag position from pointerup coordinates (not stale dragRect)", async () => {
    const proto = HTMLElement.prototype;
    const prevCapture = proto.setPointerCapture;
    const prevRelease = proto.releasePointerCapture;
    proto.setPointerCapture = vi.fn();
    proto.releasePointerCapture = vi.fn();
    try {
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
      const updateSpy = vi.spyOn(useSettingsStore.getState(), "update");
      const { container } = render(<TeleprompterView />);
      const handle = container.querySelector(
        "[data-gp-drag-handle]",
      ) as HTMLElement;
      const vp = container.querySelector(
        "[data-gp-viewport]",
      ) as HTMLElement;
      const screenSize = { w: window.innerWidth, h: window.innerHeight };
      const startRect = { x: 100, y: 100, w: 400, h: 300 };

      const Ptr =
        typeof globalThis.PointerEvent !== "undefined"
          ? globalThis.PointerEvent
          : class extends MouseEvent {
              constructor(type: string, init?: MouseEventInit) {
                super(type, init);
              }
            };
      const pe = (type: string, x: number, y: number) =>
        new Ptr(type, {
          bubbles: true,
          clientX: x,
          clientY: y,
          pointerId: 1,
        } as MouseEventInit);
      act(() => {
        handle.dispatchEvent(pe("pointerdown", 100, 100));
        vp.dispatchEvent(pe("pointermove", 250, 180));
        vp.dispatchEvent(pe("pointerup", 250, 180));
      });

      await Promise.resolve();
      const expected = applyMoveDelta(startRect, 150, 80, screenSize);
      const dragPatch = updateSpy.mock.calls
        .map((c) => c[0] as Record<string, unknown>)
        .find(
          (p) =>
            typeof p.overlayX === "number" &&
            typeof p.overlayY === "number" &&
            typeof p.overlayWidth === "number" &&
            typeof p.overlayHeight === "number",
        );
      expect(dragPatch).toMatchObject({
        overlayX: expected.x,
        overlayY: expected.y,
        overlayWidth: expected.w,
        overlayHeight: expected.h,
      });
    } finally {
      proto.setPointerCapture = prevCapture;
      proto.releasePointerCapture = prevRelease;
    }
  });

  it("uses stable listener identity so removeEventListener can tear down window listeners across multiple drags", async () => {
    // Regression: plain function declarations inside the component body are
    // recreated on every render. `setDragRect` during a drag causes
    // re-renders, so the function references stored as listeners at
    // `beginDrag` time differ from the ones in scope when `endDrag` calls
    // removeEventListener — listeners leak, accumulate across drags, and
    // eventually break drag behavior. The fix installs stable dispatcher
    // references via useRef. This test asserts that every listener added on
    // pointerdown is matched by a successful removal on pointerup and that
    // no zombie listeners remain after two drags.
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

    type LE = { type: string; fn: EventListenerOrEventListenerObject };
    const added: LE[] = [];
    const removed: LE[] = [];
    const realAdd = window.addEventListener.bind(window);
    const realRemove = window.removeEventListener.bind(window);
    const addSpy = vi
      .spyOn(window, "addEventListener")
      .mockImplementation(((
        type: string,
        fn: EventListenerOrEventListenerObject,
        opts?: boolean | AddEventListenerOptions,
      ) => {
        if (
          type === "pointermove" ||
          type === "pointerup" ||
          type === "pointercancel"
        ) {
          added.push({ type, fn });
        }
        return realAdd(type as keyof WindowEventMap, fn as EventListener, opts);
      }) as typeof window.addEventListener);
    const removeSpy = vi
      .spyOn(window, "removeEventListener")
      .mockImplementation(((
        type: string,
        fn: EventListenerOrEventListenerObject,
        opts?: boolean | EventListenerOptions,
      ) => {
        if (
          type === "pointermove" ||
          type === "pointerup" ||
          type === "pointercancel"
        ) {
          removed.push({ type, fn });
        }
        return realRemove(
          type as keyof WindowEventMap,
          fn as EventListener,
          opts,
        );
      }) as typeof window.removeEventListener);

    try {
      const { container } = render(<TeleprompterView />);
      const handle = container.querySelector(
        "[data-gp-drag-handle]",
      ) as HTMLElement;

      const Ptr =
        typeof globalThis.PointerEvent !== "undefined"
          ? globalThis.PointerEvent
          : class extends MouseEvent {
              constructor(type: string, init?: MouseEventInit) {
                super(type, init);
              }
            };
      const pe = (type: string, x: number, y: number, id = 3) =>
        new Ptr(type, {
          bubbles: true,
          clientX: x,
          clientY: y,
          pointerId: id,
        } as MouseEventInit);

      // --- Drag #1 ---
      act(() => {
        handle.dispatchEvent(pe("pointerdown", 100, 100));
      });
      act(() => {
        window.dispatchEvent(pe("pointermove", 140, 130));
        window.dispatchEvent(pe("pointermove", 180, 150));
        window.dispatchEvent(pe("pointerup", 200, 160));
      });
      await Promise.resolve();

      // --- Drag #2 ---
      act(() => {
        handle.dispatchEvent(pe("pointerdown", 210, 170, 4));
      });
      act(() => {
        window.dispatchEvent(pe("pointermove", 230, 190, 4));
        window.dispatchEvent(pe("pointerup", 260, 210, 4));
      });
      await Promise.resolve();

      // For every pointermove/up/cancel listener we added, the SAME function
      // reference must have been passed to removeEventListener.
      for (const a of added) {
        const match = removed.find((r) => r.type === a.type && r.fn === a.fn);
        expect(
          match,
          `no matching removeEventListener for ${a.type}`,
        ).toBeDefined();
      }

      // Count net outstanding listeners by (type, fn identity).
      const key = (e: LE) =>
        `${e.type}::${
          (e.fn as unknown as { name?: string }).name ?? "anon"
        }::${String((e.fn as unknown) as object)}`;
      const balance = new Map<string, number>();
      for (const a of added) balance.set(key(a), (balance.get(key(a)) ?? 0) + 1);
      for (const r of removed) balance.set(key(r), (balance.get(key(r)) ?? 0) - 1);
      for (const [, v] of balance) {
        expect(v).toBe(0);
      }
    } finally {
      addSpy.mockRestore();
      removeSpy.mockRestore();
    }
  });

  it("renders a Snap button in the edit-mode cluster", () => {
    useModeStore.setState({ editMode: true });
    render(<TeleprompterView />);
    expect(screen.getByRole("button", { name: "Snap" })).toBeInTheDocument();
  });

  it("clicking Snap opens the snap popover", async () => {
    useModeStore.setState({ editMode: true });
    const user = userEvent.setup();
    const { container } = render(<TeleprompterView />);
    expect(container.querySelector("[data-gp-snap-popover]")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Snap" }));
    expect(container.querySelector("[data-gp-snap-popover]")).not.toBeNull();
  });

  it("picking the 'Full screen' preset persists the rect AND resizes the OS window", async () => {
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
    // discard the mount-time setOverlayRect invocation
    invokeMock.mockClear();
    await user.click(screen.getByRole("button", { name: "Snap" }));
    await user.click(screen.getByRole("menuitem", { name: "Full screen" }));
    // microtasks for update()
    await Promise.resolve();
    await Promise.resolve();
    const s = useSettingsStore.getState().settings;
    expect(s.overlayX).toBe(0);
    expect(s.overlayY).toBe(0);
    expect(s.overlayWidth).toBe(window.innerWidth);
    expect(s.overlayHeight).toBe(window.innerHeight);
    // And the OS window was resized to match
    const call = invokeMock.mock.calls.find(
      (c) => c[0] === "set_overlay_rect",
    );
    expect(call?.[1]).toEqual({
      x: 0,
      y: 0,
      w: window.innerWidth,
      h: window.innerHeight,
    });
  });

  it("picking the 'Top right' preset lands flush against the top-right corner", async () => {
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
    const s = useSettingsStore.getState().settings;
    expect(s.overlayY).toBe(0);
    expect((s.overlayX ?? 0) + s.overlayWidth).toBe(window.innerWidth);
  });

  it("root has pointer-events:none when not in edit mode (keeps click-through)", () => {
    useModeStore.setState({ editMode: false });
    const { container } = render(<TeleprompterView />);
    const root = container.firstChild as HTMLElement;
    expect(root.style.pointerEvents).toBe("none");
  });

  it("viewport panel has pointer-events:auto so the reading rectangle is interactive", () => {
    useModeStore.setState({ editMode: false });
    const { container } = render(<TeleprompterView />);
    const vp = container.querySelector(
      "[data-gp-viewport]",
    ) as HTMLElement | null;
    expect(vp).not.toBeNull();
    expect(vp!.style.pointerEvents).toBe("auto");
  });
});
