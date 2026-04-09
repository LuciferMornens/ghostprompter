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
    <div className="gp-shell relative overflow-hidden">
      {/* Aurora backdrop */}
      <div className="gp-aurora" aria-hidden />

      {/* ================= MASTHEAD ================= */}
      <header className="gp-topbar gp-reveal gp-reveal-1">
        <div className="gp-topbar-left">
          <BrandMark />
          <div className="gp-wordmark">
            <span className="gp-wordmark-title">
              Ghost<em>prompter</em>
            </span>
            <span className="gp-wordmark-kicker">a quiet teleprompter</span>
          </div>
        </div>

        <div className="gp-topbar-center">
          <div
            className="gp-filecrest"
            aria-label={`Script ${script.name}${
              script.dirty ? ", unsaved changes" : ""
            }`}
          >
            <span
              className={`gp-filecrest__dot ${
                script.dirty ? "gp-filecrest__dot--dirty" : ""
              }`.trim()}
              aria-hidden
            />
            <span className="gp-filecrest__name">
              {script.name}
              {script.dirty ? " •" : ""}
            </span>
            <span className="gp-filecrest__rule" aria-hidden />
            <span
              className={`gp-filecrest__state ${
                script.dirty ? "gp-filecrest__state--dirty" : ""
              }`.trim()}
            >
              {script.dirty ? "Draft" : "Saved"}
            </span>
          </div>
        </div>

        <div className="gp-topbar-right">
          <div className="gp-toolgroup">
            <ToolbarButton onClick={newScript}>New</ToolbarButton>
            <ToolbarButton onClick={openFromDisk}>Open</ToolbarButton>
            <ToolbarButton onClick={saveToDisk}>Save</ToolbarButton>
            <ToolbarButton onClick={saveAs}>Save As</ToolbarButton>
          </div>
          <span className="gp-topbar-sep" aria-hidden />
          <ToolbarButton onClick={() => setSettingsOpen(true)}>
            Settings
          </ToolbarButton>
          <span className="gp-topbar-sep" aria-hidden />
          <button
            onClick={onGo}
            className="gp-btn-live"
            aria-label="Go Live"
          >
            <span className="gp-btn-live-dot" aria-hidden />
            Go Live
          </button>
        </div>
      </header>

      {/* ================= MAIN WORKAREA ================= */}
      <main className="gp-workarea">
        {/* Editor panel */}
        <section className="gp-panel gp-reveal gp-reveal-2">
          <PanelHeader numeral="01" label="Script" meta="draft · markdown" />
          <div className="gp-frame gp-frame--editor flex-1 min-h-0 flex overflow-hidden">
            <MarkdownEditor />
          </div>
        </section>

        {/* Preview panel */}
        <section className="gp-panel gp-reveal gp-reveal-3">
          <PanelHeader
            numeral="02"
            label="Preview"
            meta="live render"
          />
          <div className="gp-frame gp-frame--preview flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-auto gp-scroll gp-frame__scroll">
              <MarkdownPreview content={script.content} />
            </div>
          </div>
        </section>
      </main>

      {/* ================= STATUS RAIL ================= */}
      <footer className="gp-statusrail gp-reveal gp-reveal-4">
        <div className="gp-statusrail__metrics">
          <StatBlock label="Words" value={stats.words} />
          <StatBlock label="Chars" value={stats.chars} />
          <StatBlock
            label="Read time"
            value={stats.duration}
            hint="150 wpm"
            accent
          />
        </div>
        <div className="gp-statusrail__spacer" aria-hidden />
        <div className="gp-hotcluster">
          <KbdHint keys={["F7"]} label="Play" />
          <KbdHint keys={["F6"]} label="Edit" />
          <KbdHint keys={["Esc"]} label="Exit" />
        </div>
      </footer>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

function BrandMark() {
  return (
    <div className="gp-brand-mark" aria-hidden>
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
          strokeOpacity="0.94"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
        <circle cx="7" cy="8.5" r="0.95" fill="#e0a46a" />
        <circle cx="11" cy="8.5" r="0.95" fill="#e0a46a" />
      </svg>
    </div>
  );
}

function PanelHeader({
  numeral,
  label,
  meta,
}: {
  numeral: string;
  label: string;
  meta: string;
}) {
  return (
    <div className="gp-panelhead">
      <div className="gp-panelhead__lead">
        <span className="gp-panelhead__numeral" aria-hidden>
          {numeral}
        </span>
        <span className="gp-panelhead__rule" aria-hidden />
        <span className="gp-panelhead__label">{label}</span>
      </div>
      <span className="gp-panelhead__meta">{meta}</span>
    </div>
  );
}

function KbdHint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <span className="gp-hothint">
      {keys.map((k) => (
        <kbd key={k}>{k}</kbd>
      ))}
      <span>{label}</span>
    </span>
  );
}

function ToolbarButton({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`gp-btn gp-btn--ghost ${className ?? ""}`.trim()}
    >
      {children}
    </button>
  );
}
