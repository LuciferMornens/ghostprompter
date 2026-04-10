import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useScriptStore } from "@/store/scriptStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useModeStore } from "@/store/modeStore";
import { ipc } from "@/lib/ipc";
import { onHotkey } from "@/lib/events";
import { getDisplayBounds, getFallbackDisplayBounds } from "@/lib/displayBounds";
import { MarkdownPreview } from "@/editor/MarkdownPreview";
import { RecDot, IconBtn } from "@/ui";
import { useAutoScroll } from "./useAutoScroll";
import { ReadingLine } from "./ReadingLine";
import {
  clampRect,
  defaultRect,
  presetRect,
  type Preset,
  type Rect,
  type ScreenSize,
} from "./viewportMath";

type ResizeDirection =
  | "North"
  | "South"
  | "East"
  | "West"
  | "NorthEast"
  | "NorthWest"
  | "SouthEast"
  | "SouthWest";

type SnapCell = { preset: Preset; label: string };
const SNAP_GRID: SnapCell[][] = [
  [
    { preset: "tl", label: "Top left" },
    { preset: "tc", label: "Top center" },
    { preset: "tr", label: "Top right" },
  ],
  [
    { preset: "ml", label: "Middle left" },
    { preset: "mc", label: "Middle" },
    { preset: "mr", label: "Middle right" },
  ],
  [
    { preset: "bl", label: "Bottom left" },
    { preset: "bc", label: "Bottom center" },
    { preset: "br", label: "Bottom right" },
  ],
];

const SNAP_STRIPS: SnapCell[] = [
  { preset: "top-strip", label: "Top strip" },
  { preset: "bottom-strip", label: "Bottom strip" },
  { preset: "left", label: "Left column" },
  { preset: "right", label: "Right column" },
  { preset: "full", label: "Full screen" },
];

function isEditableKeyboardTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

function useScreenSize() {
  const [size, setSize] = useState<ScreenSize>(() => getFallbackDisplayBounds());
  const [ready, setReady] = useState(false);
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const next = await getDisplayBounds();
        if (cancelled) return;
        setSize(next);
        setReady(true);
    };
    refreshRef.current = refresh;
    refresh();
    const onResize = () => {
      void refresh();
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
    };
  }, []);
  return {
    screen: { ...size, ready } as ScreenSize & { ready: boolean },
    refresh: () => refreshRef.current(),
  };
}

export function TeleprompterView() {
  const content = useScriptStore((s) => s.script.content);
  const scriptName = useScriptStore((s) => s.script.name);
  const settings = useSettingsStore((s) => s.settings);
  const settingsLoaded = useSettingsStore((s) => s.loaded);
  const update = useSettingsStore((s) => s.update);
  const playing = useModeStore((s) => s.playing);
  const setPlaying = useModeStore((s) => s.setPlaying);
  const editMode = useModeStore((s) => s.editMode);
  const setEditMode = useModeStore((s) => s.setEditMode);
  const hidden = useModeStore((s) => s.hidden);
  const setMode = useModeStore((s) => s.setMode);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { screen, refresh: refreshScreen } = useScreenSize();
  const overlayWindowRef = useRef<ReturnType<typeof getCurrentWindow> | null>(null);
  if (overlayWindowRef.current === null) {
    try {
      overlayWindowRef.current = getCurrentWindow();
    } catch {
      overlayWindowRef.current = null;
    }
  }

  // =========================================================================
  // Viewport rect: settings → persisted, transient local overrides for drag
  //
  // Important: the OS window is resized and moved to match this rect via the
  // `set_overlay_rect` Tauri command. The DOM panel always fills its window
  // (inset: 0) — we never use `rect.x/rect.y` to position the DOM element
  // because that would leave a huge transparent-but-shadowed ghost window
  // around the visible panel. The rect still drives drag/resize math, the
  // window position on the real monitor, and persistence.
  // =========================================================================
  const persistedRect = useMemo<Rect>(() => {
    if (settings.overlayX === null || settings.overlayY === null) {
      return defaultRect(screen);
    }
    return clampRect(
      {
        x: settings.overlayX,
        y: settings.overlayY,
        w: settings.overlayWidth,
        h: settings.overlayHeight,
      },
      screen,
    );
  }, [
    settings.overlayX,
    settings.overlayY,
    settings.overlayWidth,
    settings.overlayHeight,
    screen,
  ]);

  const [windowRect, setWindowRect] = useState<Rect | null>(null);
  const [isGesturing, setIsGesturing] = useState(false);
  const initializedOverlayRef = useRef(false);
  const isGesturingRef = useRef(false);
  const rect = windowRect ?? persistedRect;
  const rectRef = useRef(rect);
  useEffect(() => {
    rectRef.current = rect;
  }, [rect]);

  // On mount: snap the OS window to the persisted rect (or, for first-run,
  // compute and persist the default rect). This is what actually kills the
  // full-screen ghost window with its drop-shadow.
  useEffect(() => {
    if (!screen.ready || !settingsLoaded || initializedOverlayRef.current) {
      return;
    }
    initializedOverlayRef.current = true;
    const target =
      settings.overlayX === null || settings.overlayY === null
        ? defaultRect(screen)
        : persistedRect;
    setWindowRect(target);
    rectRef.current = target;
    void ipc.setOverlayRect(target);
    if (settings.overlayX === null || settings.overlayY === null) {
      void update({
        overlayX: target.x,
        overlayY: target.y,
        overlayWidth: target.w,
        overlayHeight: target.h,
      });
    }
    // Only on mount — drag/resize/snap pushes subsequent rects explicitly.
  }, [persistedRect, screen, settings.overlayX, settings.overlayY, settingsLoaded, update]);

  const setPaused = useCallback(() => {
    setPlaying(false);
  }, [setPlaying]);

  useAutoScroll(scrollRef, settings.scrollSpeed, playing, setPaused);

  // =========================================================================
  // Native window move / resize sync
  //
  // The overlay is a real frameless Tauri window. If we only resized an
  // inner DOM panel during pointermove, the pointer would get trapped inside
  // the current small OS window and resize would feel "contained". The fix is
  // to let the OS own the gesture via Tauri's native drag/resize APIs, then
  // mirror the real window bounds back into React/settings from window events.
  // =========================================================================
  // Move/resize events from the OS arrive per pixel. Writing Zustand +
  // settings.json and refreshing monitor bounds on every one of them freezes
  // the UI on Windows. We coalesce visual updates into a single rAF and only
  // persist + refresh on a trailing debounce (gesture end).
  const pendingRectRef = useRef<Rect | null>(null);
  const rafRef = useRef(0);
  const persistTimerRef = useRef<number | null>(null);
  const gestureEndTimerRef = useRef<number | null>(null);

  const cancelPendingSync = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (persistTimerRef.current !== null) {
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
    if (gestureEndTimerRef.current !== null) {
      clearTimeout(gestureEndTimerRef.current);
      gestureEndTimerRef.current = null;
    }
    pendingRectRef.current = null;
    if (isGesturingRef.current) {
      isGesturingRef.current = false;
      setIsGesturing(false);
    }
  }, []);

  // Latest `update` / `refreshScreen` for async timers: callbacks read `.current`
  // when they run (not when scheduled). Assign every render so there is no gap
  // before an effect runs after identity changes.
  const refreshScreenRef = useRef(refreshScreen);
  refreshScreenRef.current = refreshScreen;
  const updateSettingsRef = useRef(update);
  updateSettingsRef.current = update;

  // Stable identity so native listeners are not torn down mid-gesture; deps
  // intentionally empty — refs above stay current.
  const scheduleNativeRect = useCallback((patch: Partial<Rect>) => {
    const base = pendingRectRef.current ?? rectRef.current;
    const next: Rect = {
      x: patch.x ?? base.x,
      y: patch.y ?? base.y,
      w: patch.w ?? base.w,
      h: patch.h ?? base.h,
    };
    pendingRectRef.current = next;

    if (!isGesturingRef.current) {
      isGesturingRef.current = true;
      setIsGesturing(true);
    }

    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const flush = pendingRectRef.current;
        if (!flush) return;
        rectRef.current = flush;
        setWindowRect(flush);
      });
    }

    if (persistTimerRef.current !== null) {
      clearTimeout(persistTimerRef.current);
    }
    persistTimerRef.current = window.setTimeout(() => {
      persistTimerRef.current = null;
      const flush = pendingRectRef.current ?? rectRef.current;
      pendingRectRef.current = null;
      rectRef.current = flush;
      void updateSettingsRef.current({
        overlayX: flush.x,
        overlayY: flush.y,
        overlayWidth: flush.w,
        overlayHeight: flush.h,
      });
      void refreshScreenRef.current();
    }, 180);

    if (gestureEndTimerRef.current !== null) {
      clearTimeout(gestureEndTimerRef.current);
    }
    gestureEndTimerRef.current = window.setTimeout(() => {
      gestureEndTimerRef.current = null;
      isGesturingRef.current = false;
      setIsGesturing(false);
    }, 260);
  }, []);

  useEffect(() => {
    const overlayWindow = overlayWindowRef.current;
    const unlistens: Array<Promise<() => void>> = [];

    if (overlayWindow) {
      const toLogicalPosition = (
        value: { x: number; y: number; toLogical?: (scale: number) => { x: number; y: number } },
        scaleFactor: number,
      ) =>
        typeof value.toLogical === "function"
          ? value.toLogical(scaleFactor)
          : { x: value.x / scaleFactor, y: value.y / scaleFactor };

      const toLogicalSize = (
        value: {
          width: number;
          height: number;
          toLogical?: (scale: number) => { width: number; height: number };
        },
        scaleFactor: number,
      ) =>
        typeof value.toLogical === "function"
          ? value.toLogical(scaleFactor)
          : { width: value.width / scaleFactor, height: value.height / scaleFactor };

      const syncScaleFactor = () => Math.max(window.devicePixelRatio || 1, 1);

      unlistens.push(
        overlayWindow
          .onMoved(({ payload }) => {
            const logical = toLogicalPosition(payload, syncScaleFactor());
            scheduleNativeRect({ x: logical.x, y: logical.y });
          })
          .catch(() => () => {}),
      );
      unlistens.push(
        overlayWindow
          .onResized(({ payload }) => {
            const logical = toLogicalSize(payload, syncScaleFactor());
            scheduleNativeRect({ w: logical.width, h: logical.height });
          })
          .catch(() => () => {}),
      );
    }

    return () => {
      unlistens.forEach((p) => p.then((fn) => fn()).catch(() => {}));
      cancelPendingSync();
    };
  }, [cancelPendingSync, scheduleNativeRect]);

  const onDragHandlePointerDown = (e: React.PointerEvent) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    void overlayWindowRef.current?.startDragging().catch((error) => {
      console.error("overlay drag failed", error);
    });
  };

  const startResize = (direction: ResizeDirection) =>
    (e: React.PointerEvent) => {
      if (!editMode) return;
      e.preventDefault();
      e.stopPropagation();
      void overlayWindowRef.current
        ?.startResizeDragging(direction)
        .catch((error) => {
          console.error("overlay resize failed", error);
        });
    };

  const onResizeGripPointerDown = startResize("SouthEast");

  // =========================================================================
  // Snap presets popover
  // =========================================================================
  const [snapOpen, setSnapOpen] = useState(false);
  const snapPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!snapOpen) return;
    const onDocDown = (e: MouseEvent) => {
      if (snapPopoverRef.current?.contains(e.target as Node)) return;
      setSnapOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSnapOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [snapOpen]);

  const applyPreset = (p: Preset) => {
    const r = presetRect(p, screen);
    setSnapOpen(false);
    setWindowRect(r);
    rectRef.current = r;
    void ipc.setOverlayRect(r);
    void update({
      overlayX: r.x,
      overlayY: r.y,
      overlayWidth: r.w,
      overlayHeight: r.h,
    });
  };

  const jumpLines = useCallback((dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    setPaused();
    const lineHeight = settings.fontSize * settings.lineHeight;
    el.scrollTop += dir * lineHeight * 1.5;
  }, [setPaused, settings.fontSize, settings.lineHeight]);

  const jumpBoundary = useCallback((edge: "start" | "end") => {
    const el = scrollRef.current;
    if (!el) return;
    setPaused();
    el.scrollTop = edge === "start" ? 0 : el.scrollHeight;
  }, [setPaused]);

  // =========================================================================
  // Keyboard
  // =========================================================================
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || isEditableKeyboardTarget(e.target)) return;
      if (e.key === " " && editMode) {
        e.preventDefault();
        setPlaying(!playing);
        return;
      }
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        jumpLines(-1);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        jumpLines(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editMode, jumpLines, playing, setPlaying]);

  useEffect(() => {
    const unlistens: Array<Promise<() => void>> = [];
    unlistens.push(onHotkey("line-up", () => jumpLines(-1)));
    unlistens.push(onHotkey("line-down", () => jumpLines(1)));
    unlistens.push(onHotkey("jump-start", () => jumpBoundary("start")));
    unlistens.push(onHotkey("jump-end", () => jumpBoundary("end")));
    return () => {
      unlistens.forEach((promise) => promise.then((fn) => fn()).catch(() => {}));
    };
  }, [jumpBoundary, jumpLines]);

  const onExit = async () => {
    try {
      await ipc.unregisterHotkeys();
      await ipc.exitTeleprompter();
      setPaused();
      setEditMode(false);
      setMode("editor");
    } catch (e) {
      console.error("exit teleprompter failed", e);
    }
  };

  const toggleEdit = async () => {
    const next = !editMode;
    setEditMode(next);
    await ipc.setEditMode(next);
  };

  const speedDelta = async (delta: number) => {
    const next = Math.max(5, Math.min(500, settings.scrollSpeed + delta));
    await update({ scrollSpeed: next });
  };

  const transform = `${settings.mirrorHorizontal ? "scaleX(-1)" : ""} ${
    settings.mirrorVertical ? "scaleY(-1)" : ""
  }`.trim();

  const bgRgba = hexToRgba(settings.bgColor, settings.bgOpacity);

  // Cluster docks to the bottom-center of the panel (which *is* the window
  // now). No complex coordinate math needed — plain absolute positioning.

  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{
        background: "transparent",
        opacity: hidden ? 0 : 1,
        transition: "opacity 220ms var(--gp-ease)",
        pointerEvents: editMode ? "auto" : "none",
      }}
    >
      {/* Drag region — only in edit mode, covers the whole root so native
          window drag still works outside the panel. */}
      {editMode && (
        <div
          data-tauri-drag-region
          className="absolute inset-0"
          style={{ pointerEvents: "none" }}
          aria-hidden
        />
      )}

      {/* ================= THE VIEWPORT PANEL =================
          The panel is flush with the Tauri window: left/top are always 0
          because the OS window has already been sized & moved to match the
          rect via `ipc.setOverlayRect`. width/height still carry the rect
          dimensions so layout inside the window is correct. */}
      <div
        data-gp-viewport
        className={`gp-vp absolute overflow-hidden${
          isGesturing ? " gp-vp--gesturing" : ""
        }`}
        style={{
          left: 0,
          top: 0,
          width: rect.w,
          height: rect.h,
          background: bgRgba,
          pointerEvents: "auto",
        }}
      >
        {/* Scrollable content inside the viewport.
            Padding is in pixels derived from the actual panel height so that
            the first line of script lands exactly on the reading line
            regardless of panel size. CSS % padding would be wrong here:
            padding-top/bottom percentages resolve against the containing
            block's *width* (a CSS quirk), not its height, so they'd bunch
            the text at the top on any panel with width ≠ height. Viewport
            units (vh) are also wrong because the panel is smaller than the
            window. Horizontal padding stays as a simple pixel gutter from
            the panel width. */}
        <div
          ref={scrollRef}
          className="absolute inset-0 overflow-auto gp-no-scrollbar"
          style={{
            paddingTop: `${Math.round(
              rect.h * settings.readingLineOffset,
            )}px`,
            paddingBottom: `${Math.round(
              rect.h * (1 - settings.readingLineOffset),
            )}px`,
            paddingLeft: `${Math.round(rect.w * 0.06)}px`,
            paddingRight: `${Math.round(rect.w * 0.06)}px`,
            color: settings.textColor,
            fontSize: `${settings.fontSize}px`,
            lineHeight: settings.lineHeight,
            fontFamily: "var(--font-display)",
            fontWeight: 500,
            letterSpacing: "-0.022em",
            transform: transform || undefined,
          }}
        >
          <div
            className="gp-prose gp-prose--stage max-w-[1400px] mx-auto"
            style={{ contain: "layout paint" }}
          >
            <MarkdownPreview content={content} />
          </div>
        </div>

        {/* Reading line — scoped to viewport */}
        {settings.highlightReadingLine && (
          <ReadingLine offset={settings.readingLineOffset} />
        )}

        {/* HUD chips inside the panel corners */}
        {!hidden && (
          <>
            <div
              className="gp-hud gp-vp-hud absolute top-3 left-3 pointer-events-none select-none"
              style={{ zIndex: 5 }}
            >
              <RecDot active={playing} />
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: playing
                    ? "var(--color-gp-paper)"
                    : "var(--color-gp-paper-dim)",
                  fontWeight: 500,
                }}
              >
                {playing ? "Rolling" : "Standby"}
              </span>
              <span
                className="h-3"
                style={{
                  width: 1,
                  background:
                    "linear-gradient(180deg, transparent, rgba(241,237,228,0.16), transparent)",
                }}
                aria-hidden
              />
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  fontWeight: 500,
                  color: "var(--color-gp-paper-dim)",
                  letterSpacing: "-0.004em",
                  maxWidth: 180,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {scriptName}
              </span>
            </div>

            <div
              className="gp-hud gp-vp-hud absolute top-3 right-3 pointer-events-none select-none"
              style={{ zIndex: 5 }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--color-gp-paper-dim-2)",
                }}
              >
                Speed
              </span>
              <span
                className="tabular-nums"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 13,
                  color: "var(--color-gp-paper)",
                  fontWeight: 600,
                  letterSpacing: "-0.012em",
                  fontFeatureSettings: '"tnum", "lnum"',
                }}
              >
                {settings.scrollSpeed}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: "var(--color-gp-mute)",
                  letterSpacing: "0.04em",
                }}
              >
                px/s
              </span>
            </div>
          </>
        )}

        {/* Edit-mode border — scoped to viewport */}
        {editMode && <div className="gp-edit-mode-border" />}

        {/* Drag handle — only in edit mode; sits under the top HUD chips */}
        {editMode && (
          <div
            data-gp-drag-handle
            aria-label="Drag to move"
            role="button"
            tabIndex={-1}
            className="gp-vp-handle absolute top-0 left-0 right-0"
            onPointerDown={onDragHandlePointerDown}
            style={{ zIndex: 4 }}
          >
            <span className="gp-vp-handle-grip" aria-hidden />
          </div>
        )}

        {/* Resize hit zones — full perimeter in edit mode.
            Edges are 6px invisible strips; corners are 14px squares. The
            SE grip still shows a visible grab icon for discoverability and
            keeps the data-gp-resize-grip hook that tests rely on. */}
        {editMode && (
          <>
            <div
              aria-hidden
              className="gp-vp-edge gp-vp-edge--n"
              onPointerDown={startResize("North")}
            />
            <div
              aria-hidden
              className="gp-vp-edge gp-vp-edge--s"
              onPointerDown={startResize("South")}
            />
            <div
              aria-hidden
              className="gp-vp-edge gp-vp-edge--e"
              onPointerDown={startResize("East")}
            />
            <div
              aria-hidden
              className="gp-vp-edge gp-vp-edge--w"
              onPointerDown={startResize("West")}
            />
            <div
              aria-hidden
              className="gp-vp-corner gp-vp-corner--nw"
              onPointerDown={startResize("NorthWest")}
            />
            <div
              aria-hidden
              className="gp-vp-corner gp-vp-corner--ne"
              onPointerDown={startResize("NorthEast")}
            />
            <div
              aria-hidden
              className="gp-vp-corner gp-vp-corner--sw"
              onPointerDown={startResize("SouthWest")}
            />
            <div
              data-gp-resize-grip
              aria-label="Resize"
              role="button"
              tabIndex={-1}
              className="gp-vp-grip gp-vp-corner gp-vp-corner--se absolute bottom-0 right-0"
              onPointerDown={onResizeGripPointerDown}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                <path
                  d="M13 1 L1 13 M13 5 L5 13 M13 9 L9 13"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </>
        )}

        {/* ================= CONTROL CLUSTER =================
            Rendered inside the viewport panel so the panel's container
            query context (`container-type: inline-size`) drives its
            responsive layout. The cluster collapses labels, then wraps to
            two rows on very narrow panels. */}
        {editMode && (
          <div
            className="gp-vp-cluster gp-scale-in"
            role="toolbar"
            aria-label="Teleprompter controls"
          >
            <div className="gp-vp-cluster-group">
              <IconBtn
                onClick={() => speedDelta(-5)}
                title="Slower"
                ariaLabel="Slower"
                compact
              >
                <span className="gp-icn-symbol" aria-hidden>
                  −
                </span>
              </IconBtn>
              <div className="gp-vp-speed" aria-live="polite">
                <span className="gp-vp-speed-label">Speed</span>
                <span className="gp-vp-speed-value tabular-nums">
                  {settings.scrollSpeed}
                </span>
                <span className="gp-vp-speed-unit">px/s</span>
              </div>
              <IconBtn
                onClick={() => speedDelta(5)}
                title="Faster"
                ariaLabel="Faster"
                compact
              >
                <span className="gp-icn-symbol" aria-hidden>
                  +
                </span>
              </IconBtn>
            </div>

            <span className="gp-vp-cluster-sep" aria-hidden />

            <div className="gp-vp-cluster-group">
              <IconBtn
                onClick={() => jumpLines(-1)}
                title="Line up"
                ariaLabel="Line up"
                compact
              >
                <span className="gp-icn-symbol" aria-hidden>
                  ↑
                </span>
              </IconBtn>
              <IconBtn
                onClick={() => setPlaying(!playing)}
                title={playing ? "Pause" : "Play"}
                ariaLabel={playing ? "Pause" : "Play"}
                hot={playing}
                className="gp-icn--primary"
              >
                <span className="gp-icn-symbol" aria-hidden>
                  {playing ? "⏸" : "▶"}
                </span>
              </IconBtn>
              <IconBtn
                onClick={() => jumpLines(1)}
                title="Line down"
                ariaLabel="Line down"
                compact
              >
                <span className="gp-icn-symbol" aria-hidden>
                  ↓
                </span>
              </IconBtn>
            </div>

            <span className="gp-vp-cluster-sep" aria-hidden />

            <div className="gp-vp-cluster-group">
              <div className="relative" ref={snapPopoverRef}>
                <IconBtn
                  onClick={() => setSnapOpen((v) => !v)}
                  title="Snap to preset layout"
                  ariaLabel="Snap"
                  hot={snapOpen}
                >
                  <svg
                    className="gp-icn-svg"
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    aria-hidden
                  >
                    <rect
                      x="1.5"
                      y="1.5"
                      width="11"
                      height="11"
                      rx="1.5"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      fill="none"
                    />
                    <line
                      x1="7"
                      y1="1.5"
                      x2="7"
                      y2="12.5"
                      stroke="currentColor"
                      strokeWidth="1.3"
                    />
                    <line
                      x1="1.5"
                      y1="7"
                      x2="12.5"
                      y2="7"
                      stroke="currentColor"
                      strokeWidth="1.3"
                    />
                  </svg>
                  <span className="gp-icn-label">Snap</span>
                </IconBtn>
                {snapOpen && (
                  <SnapPopover
                    onPick={applyPreset}
                    current={rect}
                    screen={screen}
                  />
                )}
              </div>
              <IconBtn
                onClick={toggleEdit}
                title="Lock overlay"
                ariaLabel="Lock overlay"
              >
                <svg
                  className="gp-icn-svg"
                  width="13"
                  height="14"
                  viewBox="0 0 13 14"
                  aria-hidden
                >
                  <rect
                    x="1.5"
                    y="6"
                    width="10"
                    height="7"
                    rx="1.3"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    fill="none"
                  />
                  <path
                    d="M3.5 6 V4.2 a3 3 0 0 1 6 0 V6"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="gp-icn-label">Lock</span>
              </IconBtn>
              <IconBtn
                onClick={onExit}
                title="Exit teleprompter"
                ariaLabel="Exit teleprompter"
                className="gp-icn--danger"
              >
                <svg
                  className="gp-icn-svg"
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  aria-hidden
                >
                  <path
                    d="M2 2 L10 10 M10 2 L2 10"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="gp-icn-label">Exit</span>
              </IconBtn>
            </div>
          </div>
        )}
      </div>

      {/* Unobtrusive hint when NOT in edit mode */}
      {!editMode && !hidden && (
        <div
          className="absolute bottom-6 right-6 pointer-events-none select-none"
          style={{
            opacity: 0.48,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.1em",
            color: "var(--color-gp-paper-dim)",
          }}
        >
          F6 edit · F7 play · Esc exit
        </div>
      )}
    </div>
  );
}

// =========================================================================
// Snap popover — 3x3 grid of positions + 5 strip/edge/full shortcuts
// =========================================================================
function SnapPopover({
  onPick,
  current,
  screen,
}: {
  onPick: (p: Preset) => void;
  current: Rect;
  screen: ScreenSize;
}) {
  const isActive = (p: Preset) => {
    const r = presetRect(p, screen);
    return (
      Math.abs(r.x - current.x) < 2 &&
      Math.abs(r.y - current.y) < 2 &&
      Math.abs(r.w - current.w) < 2 &&
      Math.abs(r.h - current.h) < 2
    );
  };

  return (
    <div
      data-gp-snap-popover
      role="menu"
      aria-label="Snap presets"
      className="gp-snap-popover absolute"
      style={{
        bottom: "calc(100% + 12px)",
        right: 0,
        pointerEvents: "auto",
        zIndex: 30,
      }}
    >
      <div className="gp-snap-grid" role="presentation">
        {SNAP_GRID.flat().map((cell) => (
          <button
            key={cell.preset}
            type="button"
            role="menuitem"
            onClick={() => onPick(cell.preset)}
            aria-label={cell.label}
            className={`gp-snap-cell ${
              isActive(cell.preset) ? "gp-snap-cell--active" : ""
            }`.trim()}
          >
            <span className="gp-snap-cell-dot" aria-hidden />
          </button>
        ))}
      </div>
      <div className="gp-snap-strips">
        {SNAP_STRIPS.map((cell) => (
          <button
            key={cell.preset}
            type="button"
            role="menuitem"
            onClick={() => onPick(cell.preset)}
            className={`gp-snap-strip ${
              isActive(cell.preset) ? "gp-snap-strip--active" : ""
            }`.trim()}
          >
            {cell.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
