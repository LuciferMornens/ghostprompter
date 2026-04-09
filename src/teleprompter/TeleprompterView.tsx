import { useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useScriptStore } from "@/store/scriptStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useModeStore } from "@/store/modeStore";
import { ipc } from "@/lib/ipc";
import { getDisplayBounds, getFallbackDisplayBounds } from "@/lib/displayBounds";
import { MarkdownPreview } from "@/editor/MarkdownPreview";
import { RecDot } from "@/ui/RecDot";
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
  const initializedOverlayRef = useRef(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistedRect, screen, settings.overlayX, settings.overlayY, settingsLoaded, update]);

  useAutoScroll(scrollRef, settings.scrollSpeed, playing);

  // =========================================================================
  // Native window move / resize sync
  //
  // The overlay is a real frameless Tauri window. If we only resized an
  // inner DOM panel during pointermove, the pointer would get trapped inside
  // the current small OS window and resize would feel "contained". The fix is
  // to let the OS own the gesture via Tauri's native drag/resize APIs, then
  // mirror the real window bounds back into React/settings from window events.
  // =========================================================================
  const syncNativeRect = (patch: Partial<Rect>) => {
    const next = {
      x: patch.x ?? rectRef.current.x,
      y: patch.y ?? rectRef.current.y,
      w: patch.w ?? rectRef.current.w,
      h: patch.h ?? rectRef.current.h,
    };
    rectRef.current = next;
    setWindowRect(next);
    void update({
      overlayX: next.x,
      overlayY: next.y,
      overlayWidth: next.w,
      overlayHeight: next.h,
    });
  };

  useEffect(() => {
    const overlayWindow = overlayWindowRef.current;
    if (!overlayWindow) return;

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
    const unlistens: Array<Promise<() => void>> = [];

    unlistens.push(
      overlayWindow
        .onMoved(({ payload }) => {
          const logical = toLogicalPosition(payload, syncScaleFactor());
          syncNativeRect({ x: logical.x, y: logical.y });
          void refreshScreen();
        })
        .catch(() => () => {}),
    );
    unlistens.push(
      overlayWindow
        .onResized(({ payload }) => {
          const logical = toLogicalSize(payload, syncScaleFactor());
          syncNativeRect({ w: logical.width, h: logical.height });
          void refreshScreen();
        })
        .catch(() => () => {}),
    );

    return () => {
      unlistens.forEach((p) => p.then((fn) => fn()).catch(() => {}));
    };
  }, [refreshScreen, update]);

  const onDragHandlePointerDown = (e: React.PointerEvent) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    void overlayWindowRef.current?.startDragging().catch((error) => {
      console.error("overlay drag failed", error);
    });
  };

  const onResizeGripPointerDown = (e: React.PointerEvent) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    void overlayWindowRef.current?.startResizeDragging("SouthEast").catch((error) => {
      console.error("overlay resize failed", error);
    });
  };

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

  // =========================================================================
  // Keyboard
  // =========================================================================
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " && editMode) {
        e.preventDefault();
        setPlaying(!playing);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, editMode, setPlaying]);

  const onExit = async () => {
    try {
      await ipc.unregisterHotkeys();
      await ipc.exitTeleprompter();
      setPlaying(false);
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

  const jumpLines = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    const lineHeight = settings.fontSize * settings.lineHeight;
    el.scrollTop += dir * lineHeight * 1.5;
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
        className="gp-vp absolute overflow-hidden"
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
          <div className="gp-prose gp-prose--stage max-w-[1400px] mx-auto">
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

        {/* Resize grip — bottom-right corner */}
        {editMode && (
          <div
            data-gp-resize-grip
            aria-label="Resize"
            role="button"
            tabIndex={-1}
            className="gp-vp-grip absolute bottom-0 right-0"
            onPointerDown={onResizeGripPointerDown}
            style={{ zIndex: 4 }}
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
        )}
      </div>

      {/* ================= CONTROL CLUSTER ================= */}
      {editMode && (
        <div
          className="gp-scale-in absolute flex items-center gap-2"
          style={{
            left: "50%",
            bottom: 14,
            transform: "translateX(-50%)",
            padding: "10px 12px",
            background: "rgba(9, 9, 11, 0.78)",
            backdropFilter: "blur(22px) saturate(118%)",
            WebkitBackdropFilter: "blur(22px) saturate(118%)",
            border: "1px solid rgba(241,237,228,0.12)",
            borderRadius: 18,
            boxShadow:
              "inset 0 1px 0 rgba(255,240,220,0.18), inset 0 0 0 1px rgba(0,0,0,0.28), 0 22px 56px -16px rgba(0,0,0,0.72), 0 10px 28px -12px rgba(199,138,74,0.2), 0 0 0 1px rgba(199,138,74,0.08)",
            pointerEvents: "auto",
            zIndex: 20,
          }}
        >
          <IconBtn onClick={() => speedDelta(-5)} title="Slower">
            −
          </IconBtn>
          <div
            className="px-3 flex flex-col items-center leading-none"
            style={{ minWidth: 52 }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 8.5,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--color-gp-paper-dim-2)",
              }}
            >
              Speed
            </span>
            <span
              className="mt-1 tabular-nums"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 13,
                color: "var(--color-gp-paper)",
                fontWeight: 600,
                letterSpacing: "-0.014em",
                fontFeatureSettings: '"tnum", "lnum"',
              }}
            >
              {settings.scrollSpeed}
            </span>
          </div>
          <IconBtn onClick={() => speedDelta(5)} title="Faster">
            +
          </IconBtn>
          <Separator />
          <IconBtn
            onClick={() => setPlaying(!playing)}
            title={playing ? "Pause" : "Play"}
            hot={playing}
          >
            {playing ? "⏸" : "▶"}
          </IconBtn>
          <IconBtn onClick={() => jumpLines(-1)} title="Line up">
            ↑
          </IconBtn>
          <IconBtn onClick={() => jumpLines(1)} title="Line down">
            ↓
          </IconBtn>
          <Separator />
          <div className="relative" ref={snapPopoverRef}>
            <IconBtn
              onClick={() => setSnapOpen((v) => !v)}
              title="Snap to preset layout"
              hot={snapOpen}
            >
              Snap
            </IconBtn>
            {snapOpen && (
              <SnapPopover
                onPick={applyPreset}
                current={rect}
                screen={screen}
              />
            )}
          </div>
          <IconBtn onClick={toggleEdit} title="Lock overlay">
            Lock
          </IconBtn>
          <IconBtn onClick={onExit} title="Exit teleprompter">
            Exit
          </IconBtn>
        </div>
      )}

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

function IconBtn({
  children,
  onClick,
  title,
  hot = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  hot?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`gp-icn ${hot ? "gp-icn-hot" : ""}`.trim()}
    >
      {children}
    </button>
  );
}

function Separator() {
  return (
    <span
      className="h-6 mx-1"
      style={{
        width: 1,
        background:
          "linear-gradient(180deg, transparent, rgba(241,237,228,0.13), transparent)",
      }}
      aria-hidden
    />
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
