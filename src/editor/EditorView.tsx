import { useMemo, useState } from "react";
import { useScriptStore } from "@/store/scriptStore";
import { useModeStore } from "@/store/modeStore";
import { useSettingsStore } from "@/store/settingsStore";
import { ipc } from "@/lib/ipc";
import { scriptStats } from "@/lib/scriptStats";
import { StatBlock } from "@/ui/StatBlock";
import { MarkdownEditor } from "./MarkdownEditor";
import { MarkdownPreview } from "./MarkdownPreview";
import { SettingsModal } from "@/settings/SettingsModal";

export function EditorView() {
  const script = useScriptStore((s) => s.script);
  const openFromDisk = useScriptStore((s) => s.openFromDisk);
  const saveToDisk = useScriptStore((s) => s.saveToDisk);
  const saveAs = useScriptStore((s) => s.saveAs);
  const newScript = useScriptStore((s) => s.newScript);
  const setMode = useModeStore((s) => s.setMode);
  const setPlaying = useModeStore((s) => s.setPlaying);
  const settings = useSettingsStore((s) => s.settings);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const stats = useMemo(() => scriptStats(script.content), [script.content]);

  const onGo = async () => {
    try {
      await ipc.enterTeleprompter();
      await ipc.registerHotkeys(settings.hotkeys);
      setPlaying(false);
      setMode("teleprompter");
    } catch (e) {
      console.error("enter teleprompter failed", e);
      alert(`Failed to enter teleprompter mode:\n${e}`);
    }
  };

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      {/* Aurora backdrop */}
      <div className="gp-aurora" aria-hidden />

      {/* ================= TOP BAR ================= */}
      <header className="relative z-10 flex items-center gap-5 px-8 pt-6 pb-4 gp-reveal gp-reveal-1">
        {/* Brand mark */}
        <div className="flex items-center gap-3">
          <BrandMark />
          <div className="flex flex-col leading-tight">
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 14.5,
                fontWeight: 600,
                letterSpacing: "-0.024em",
                color: "var(--color-gp-paper)",
              }}
            >
              Ghostprompter
            </span>
            <span
              className="mt-[2px]"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                fontWeight: 400,
                letterSpacing: "0.18em",
                color: "var(--color-gp-mute)",
                textTransform: "uppercase",
              }}
            >
              a quiet teleprompter
            </span>
          </div>
        </div>

        {/* Centered script name chip */}
        <div className="flex-1 flex justify-center">
          <span
            className={`gp-chip ${
              script.dirty ? "gp-chip--dirty" : "gp-chip--dot"
            }`}
          >
            <span
              className="truncate max-w-[440px]"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11.5,
                fontWeight: 500,
                color: "var(--color-gp-paper)",
                letterSpacing: "-0.005em",
              }}
            >
              {script.name}
              {script.dirty ? " •" : ""}
            </span>
          </span>
        </div>

        {/* Right-side actions */}
        <div className="flex items-center gap-1.5">
          <ToolbarButton onClick={newScript}>New</ToolbarButton>
          <ToolbarButton onClick={openFromDisk}>Open</ToolbarButton>
          <ToolbarButton onClick={saveToDisk}>Save</ToolbarButton>
          <ToolbarButton onClick={saveAs}>Save As</ToolbarButton>
          <span className="gp-divider mx-2" />
          <ToolbarButton onClick={() => setSettingsOpen(true)}>
            Settings
          </ToolbarButton>
          <button
            onClick={onGo}
            className="gp-btn-live ml-2"
            aria-label="Go Live"
          >
            <span className="gp-btn-live-dot" aria-hidden />
            Go Live
          </button>
        </div>
      </header>

      {/* ================= MAIN WORKAREA ================= */}
      <main className="relative z-10 flex-1 min-h-0 px-8 pb-5 grid grid-cols-2 gap-5">
        {/* Editor panel */}
        <section className="relative flex flex-col min-h-0 gp-reveal gp-reveal-2">
          <PanelHeader label="Script" code="draft" />
          <div className="gp-glass gp-glass-sheen flex-1 min-h-0 flex overflow-hidden">
            <MarkdownEditor />
          </div>
        </section>

        {/* Preview panel */}
        <section className="relative flex flex-col min-h-0 gp-reveal gp-reveal-3">
          <PanelHeader label="Preview" code="live render" />
          <div className="gp-glass gp-glass-sheen flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-auto gp-scroll px-12 py-11">
              <MarkdownPreview content={script.content} />
            </div>
          </div>
        </section>
      </main>

      {/* ================= STATUS BAR ================= */}
      <footer className="relative z-10 px-8 pb-6 gp-reveal gp-reveal-4">
        <div className="gp-glass gp-glass-sheen flex items-center gap-7 px-7 py-4">
          <StatBlock label="Words" value={stats.words} />
          <span className="gp-divider" />
          <StatBlock label="Chars" value={stats.chars} />
          <span className="gp-divider" />
          <StatBlock
            label="Read time"
            value={stats.duration}
            hint="at 150 wpm"
          />
          <div className="flex-1" />
          <div className="flex items-center gap-3.5">
            <KbdHint keys={["F7"]} label="Play" />
            <KbdHint keys={["F6"]} label="Edit" />
            <KbdHint keys={["Esc"]} label="Exit" />
          </div>
        </div>
      </footer>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

function BrandMark() {
  return (
    <div
      className="relative grid place-items-center"
      aria-hidden
      style={{
        width: 32,
        height: 32,
        borderRadius: 10,
        background:
          "linear-gradient(145deg, rgba(255,240,220,0.1), rgba(255,240,220,0.015) 45%, rgba(0,0,0,0.2)), #131114",
        border: "1px solid rgba(199,138,74,0.28)",
        boxShadow:
          "inset 0 1px 0 rgba(255,240,220,0.22), 0 6px 18px -10px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.28) inset",
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 18 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: "relative" }}
      >
        <path
          d="M3 8a6 6 0 1 1 12 0v8l-2-1.5L11 16l-2-1.5L7 16l-2-1.5L3 16V8Z"
          stroke="#f1ede4"
          strokeOpacity="0.92"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
        <circle cx="7" cy="8.5" r="0.9" fill="#e0a46a" />
        <circle cx="11" cy="8.5" r="0.9" fill="#e0a46a" />
      </svg>
    </div>
  );
}

function PanelHeader({ label, code }: { label: string; code: string }) {
  return (
    <div className="flex items-center justify-between px-2 pb-3 pt-0">
      <span
        className="inline-flex items-center gap-2.5"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 11.5,
          fontWeight: 600,
          letterSpacing: "-0.008em",
          color: "var(--color-gp-paper)",
        }}
      >
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: 4,
            height: 4,
            background: "var(--color-gp-bronze)",
            boxShadow: "0 0 8px rgba(199,138,74,0.55)",
          }}
        />
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 8.5,
          fontWeight: 400,
          letterSpacing: "0.22em",
          color: "var(--color-gp-mute)",
          textTransform: "uppercase",
        }}
      >
        {code}
      </span>
    </div>
  );
}

function KbdHint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        color: "var(--color-gp-paper-dim-2)",
        letterSpacing: "0.04em",
      }}
    >
      {keys.map((k) => (
        <kbd key={k} className="gp-kbd">
          {k}
        </kbd>
      ))}
      <span className="ml-0.5">{label}</span>
    </span>
  );
}

function ToolbarButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="gp-btn">
      {children}
    </button>
  );
}
