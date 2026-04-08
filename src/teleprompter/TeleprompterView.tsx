import { useEffect, useRef } from "react";
import { useScriptStore } from "@/store/scriptStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useModeStore } from "@/store/modeStore";
import { ipc } from "@/lib/ipc";
import { MarkdownPreview } from "@/editor/MarkdownPreview";
import { ChannelLabel } from "@/ui/ChannelLabel";
import { RecDot } from "@/ui/RecDot";
import { useAutoScroll } from "./useAutoScroll";
import { ReadingLine } from "./ReadingLine";

export function TeleprompterView() {
  const content = useScriptStore((s) => s.script.content);
  const scriptName = useScriptStore((s) => s.script.name);
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const playing = useModeStore((s) => s.playing);
  const setPlaying = useModeStore((s) => s.setPlaying);
  const editMode = useModeStore((s) => s.editMode);
  const setEditMode = useModeStore((s) => s.setEditMode);
  const hidden = useModeStore((s) => s.hidden);
  const setMode = useModeStore((s) => s.setMode);
  const scrollRef = useRef<HTMLDivElement>(null);

  useAutoScroll(scrollRef, settings.scrollSpeed, playing);

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

  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{
        background: bgRgba,
        opacity: hidden ? 0 : 1,
        transition: "opacity 140ms var(--gp-ease)",
      }}
    >
      {/* Drag region only in edit mode */}
      {editMode && (
        <div
          data-tauri-drag-region
          className="absolute top-0 left-0 right-0 h-10 cursor-move"
          style={{
            background: "rgba(255,255,255,0.03)",
            borderBottom: "1px solid rgba(255,160,51,0.25)",
          }}
        />
      )}

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className="absolute inset-0 overflow-auto gp-no-scrollbar px-16"
        style={{
          paddingTop: "50vh",
          paddingBottom: "50vh",
          color: settings.textColor,
          fontSize: `${settings.fontSize}px`,
          lineHeight: settings.lineHeight,
          fontFamily: "var(--font-prompter)",
          fontWeight: 500,
          transform: transform || undefined,
        }}
      >
        <div className="gp-prose gp-prose--stage max-w-[1400px] mx-auto">
          <MarkdownPreview content={content} />
        </div>
      </div>

      {/* Reading line */}
      {settings.highlightReadingLine && (
        <ReadingLine offset={settings.readingLineOffset} />
      )}

      {/* Top-left HUD (always visible when not hidden) — REC + channel */}
      {!hidden && (
        <div
          className="absolute top-4 left-4 flex items-center gap-3 pointer-events-none select-none"
          style={{
            padding: "6px 12px",
            background: "rgba(8,8,10,0.55)",
            backdropFilter: "blur(4px)",
            border: "1px solid rgba(255,160,51,0.25)",
            borderRadius: 2,
          }}
        >
          <RecDot active={playing} />
          <span
            className="text-[10px] tracking-[0.25em] uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              color: playing
                ? "var(--color-gp-amber)"
                : "var(--color-gp-mute)",
            }}
          >
            {playing ? "ON AIR" : "STANDBY"}
          </span>
          <span
            className="h-3 w-px"
            style={{ background: "rgba(255,255,255,0.15)" }}
            aria-hidden
          />
          <ChannelLabel code="CH.00" label={scriptName} tone="phosphor" />
        </div>
      )}

      {/* Top-right HUD: speed readout */}
      {!hidden && (
        <div
          className="absolute top-4 right-4 flex items-center gap-2 pointer-events-none select-none"
          style={{
            padding: "6px 12px",
            background: "rgba(8,8,10,0.55)",
            backdropFilter: "blur(4px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 2,
          }}
        >
          <span
            className="text-[9px] tracking-[0.22em] uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--color-gp-mute)",
            }}
          >
            SPEED
          </span>
          <span
            className="text-xs tabular-nums"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--color-gp-paper)",
            }}
          >
            {settings.scrollSpeed}
          </span>
          <span
            className="text-[9px]"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--color-gp-mute-2)",
            }}
          >
            PX/S
          </span>
        </div>
      )}

      {/* Edit mode controls */}
      {editMode && (
        <>
          <div className="gp-edit-mode-border" />
          <div
            className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5"
            style={{
              padding: "8px 12px",
              background: "rgba(8,8,10,0.9)",
              border: "1px solid var(--color-gp-line-strong)",
              borderRadius: 4,
              boxShadow:
                "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,160,51,0.2)",
            }}
          >
            <IconBtn onClick={() => speedDelta(-5)} title="Slower">
              −
            </IconBtn>
            <div
              className="px-2 flex flex-col items-center leading-none"
              style={{ minWidth: 56 }}
            >
              <span
                className="text-[8px] tracking-[0.22em] uppercase"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--color-gp-mute)",
                }}
              >
                SPEED
              </span>
              <span
                className="text-xs mt-1 tabular-nums"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--color-gp-paper)",
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
            <IconBtn onClick={toggleEdit} title="Lock overlay">
              Lock
            </IconBtn>
            <IconBtn onClick={onExit} title="Exit teleprompter">
              Exit
            </IconBtn>
          </div>
        </>
      )}

      {/* Unobtrusive hint when NOT in edit mode */}
      {!editMode && !hidden && (
        <div
          className="absolute bottom-3 right-4 text-[10px] pointer-events-none select-none"
          style={{
            opacity: 0.45,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.12em",
            color: "var(--color-gp-paper-dim)",
          }}
        >
          F6 edit · F7 play · Esc exit
        </div>
      )}
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
      className="inline-flex items-center justify-center"
      style={{
        minWidth: 32,
        height: 32,
        padding: "0 10px",
        background: hot
          ? "rgba(255,160,51,0.15)"
          : "var(--color-gp-surface)",
        color: hot
          ? "var(--color-gp-amber)"
          : "var(--color-gp-paper-dim)",
        border: `1px solid ${
          hot ? "var(--color-gp-amber)" : "var(--color-gp-line)"
        }`,
        borderRadius: 2,
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        textTransform: "none",
        letterSpacing: "0.04em",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Separator() {
  return (
    <span
      className="h-5 w-px mx-0.5"
      style={{ background: "var(--color-gp-line)" }}
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
