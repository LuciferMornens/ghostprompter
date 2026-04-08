import { useEffect, useRef } from "react";
import { useScriptStore } from "@/store/scriptStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useModeStore } from "@/store/modeStore";
import { ipc } from "@/lib/ipc";
import { MarkdownPreview } from "@/editor/MarkdownPreview";
import { useAutoScroll } from "./useAutoScroll";
import { ReadingLine } from "./ReadingLine";

export function TeleprompterView() {
  const content = useScriptStore((s) => s.script.content);
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

  // Bridge mode-changed events to store
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // When in edit mode, allow manual scroll arrow keys
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
      className="relative w-screen h-screen"
      style={{
        background: bgRgba,
        opacity: hidden ? 0 : 1,
        transition: "opacity 120ms ease-out",
      }}
    >
      {/* Drag region (only when in edit mode) */}
      {editMode && (
        <div
          data-tauri-drag-region
          className="absolute top-0 left-0 right-0 h-8 cursor-move"
          style={{ background: "rgba(255,255,255,0.04)" }}
        />
      )}

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className="absolute inset-0 overflow-auto gp-no-scrollbar px-10"
        style={{
          paddingTop: "50vh",
          paddingBottom: "50vh",
          color: settings.textColor,
          fontSize: `${settings.fontSize}px`,
          lineHeight: settings.lineHeight,
          fontFamily: settings.fontFamily,
          transform: transform || undefined,
        }}
      >
        <MarkdownPreview content={content} />
      </div>

      {/* Reading line */}
      {settings.highlightReadingLine && (
        <ReadingLine offset={settings.readingLineOffset} />
      )}

      {/* Edit mode controls */}
      {editMode && (
        <>
          <div className="gp-edit-mode-border" />
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-xl border border-ghost-border"
            style={{ background: "rgba(10,10,16,0.9)" }}
          >
            <IconBtn onClick={() => speedDelta(-5)}>−</IconBtn>
            <span className="text-xs text-ghost-muted w-20 text-center">
              {settings.scrollSpeed} px/s
            </span>
            <IconBtn onClick={() => speedDelta(5)}>+</IconBtn>
            <div className="w-px h-5 bg-ghost-border mx-1" />
            <IconBtn onClick={() => setPlaying(!playing)}>
              {playing ? "⏸" : "▶"}
            </IconBtn>
            <IconBtn onClick={() => jumpLines(-1)}>↑</IconBtn>
            <IconBtn onClick={() => jumpLines(1)}>↓</IconBtn>
            <div className="w-px h-5 bg-ghost-border mx-1" />
            <IconBtn onClick={toggleEdit}>Lock</IconBtn>
            <IconBtn onClick={onExit}>Exit</IconBtn>
          </div>
        </>
      )}

      {/* Unobtrusive hint when NOT in edit mode */}
      {!editMode && !hidden && (
        <div
          className="absolute bottom-2 right-3 text-[10px] text-ghost-muted pointer-events-none select-none"
          style={{ opacity: 0.35 }}
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
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="min-w-8 h-8 px-2 rounded-md bg-ghost-panel text-ghost-text border border-ghost-border hover:bg-ghost-panel-2 text-sm"
    >
      {children}
    </button>
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
