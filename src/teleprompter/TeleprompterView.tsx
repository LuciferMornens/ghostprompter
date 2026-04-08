import { useEffect, useRef } from "react";
import { useScriptStore } from "@/store/scriptStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useModeStore } from "@/store/modeStore";
import { ipc } from "@/lib/ipc";
import { MarkdownPreview } from "@/editor/MarkdownPreview";
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
        transition: "opacity 220ms var(--gp-ease)",
      }}
    >
      {/* Drag region only in edit mode */}
      {editMode && (
        <div
          data-tauri-drag-region
          className="absolute top-0 left-0 right-0 h-10 cursor-move"
          style={{
            background: "rgba(255,255,255,0.02)",
          }}
        />
      )}

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className="absolute inset-0 overflow-auto gp-no-scrollbar"
        style={{
          paddingTop: "50vh",
          paddingBottom: "50vh",
          paddingLeft: "10vw",
          paddingRight: "10vw",
          color: settings.textColor,
          fontSize: `${settings.fontSize}px`,
          lineHeight: settings.lineHeight,
          fontFamily: "var(--font-prompter)",
          fontWeight: 400,
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

      {/* Top-left HUD — REC + script name, floating glass chip */}
      {!hidden && (
        <div className="gp-hud gp-scale-in absolute top-6 left-6 pointer-events-none select-none">
          <RecDot active={playing} />
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 10.5,
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
            className="h-3.5"
            style={{
              width: 1,
              background:
                "linear-gradient(180deg, transparent, rgba(255,255,255,0.18), transparent)",
            }}
            aria-hidden
          />
          <span
            style={{
              fontFamily: "var(--font-prompter)",
              fontStyle: "italic",
              fontSize: 12.5,
              fontVariationSettings: '"opsz" 144',
              color: "var(--color-gp-paper-dim)",
              letterSpacing: "-0.005em",
              maxWidth: 220,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {scriptName}
          </span>
        </div>
      )}

      {/* Top-right HUD — speed readout */}
      {!hidden && (
        <div className="gp-hud gp-scale-in absolute top-6 right-6 pointer-events-none select-none">
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9.5,
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
              fontFamily: "var(--font-prompter)",
              fontSize: 15,
              fontVariationSettings: '"opsz" 144',
              color: "var(--color-gp-paper)",
              fontWeight: 500,
              letterSpacing: "-0.012em",
            }}
          >
            {settings.scrollSpeed}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9.5,
              color: "var(--color-gp-mute)",
              letterSpacing: "0.04em",
            }}
          >
            px/s
          </span>
        </div>
      )}

      {/* Edit-mode controls — glass island */}
      {editMode && (
        <>
          <div className="gp-edit-mode-border" />
          <div
            className="gp-scale-in absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2"
            style={{
              padding: "11px 13px",
              background: "rgba(9, 11, 17, 0.74)",
              backdropFilter: "blur(34px) saturate(170%)",
              WebkitBackdropFilter: "blur(34px) saturate(170%)",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 20,
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 0 0 1px rgba(0,0,0,0.25), 0 26px 70px -14px rgba(0,0,0,0.72), 0 10px 30px -10px rgba(110,198,255,0.18), 0 0 0 1px rgba(110,198,255,0.08)",
            }}
          >
            <IconBtn onClick={() => speedDelta(-5)} title="Slower">
              −
            </IconBtn>
            <div
              className="px-3.5 flex flex-col items-center leading-none"
              style={{ minWidth: 64 }}
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
                className="mt-1.5 tabular-nums"
                style={{
                  fontFamily: "var(--font-prompter)",
                  fontSize: 16,
                  fontVariationSettings: '"opsz" 144',
                  color: "var(--color-gp-paper)",
                  fontWeight: 500,
                  letterSpacing: "-0.014em",
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
          "linear-gradient(180deg, transparent, rgba(255,255,255,0.14), transparent)",
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
