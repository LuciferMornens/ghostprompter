import { useMemo, useState } from "react";
import { useScriptStore } from "@/store/scriptStore";
import { useModeStore } from "@/store/modeStore";
import { useSettingsStore } from "@/store/settingsStore";
import { ipc } from "@/lib/ipc";
import { scriptStats } from "@/lib/scriptStats";
import { ChannelLabel } from "@/ui/ChannelLabel";
import { Frame } from "@/ui/Frame";
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
    <div
      className="relative flex flex-col h-full overflow-hidden gp-grain"
      style={{ color: "var(--color-gp-paper)" }}
    >
      {/* ================= TOP BAR ================= */}
      <header
        className="relative flex items-center gap-4 px-6 h-14 border-b gp-reveal gp-reveal-1"
        style={{
          borderColor: "var(--color-gp-line)",
          background:
            "linear-gradient(180deg, var(--color-gp-surface-2), var(--color-gp-surface))",
        }}
      >
        {/* Brand mark */}
        <div className="flex items-center gap-3">
          <BrandMark />
          <div className="flex flex-col leading-none">
            <span
              className="text-[15px]"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                letterSpacing: "-0.01em",
              }}
            >
              GhostPrompter
            </span>
            <span
              className="text-[9px] mt-0.5"
              style={{
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.25em",
                color: "var(--color-gp-mute)",
              }}
            >
              BROADCAST TERMINAL · v0.1
            </span>
          </div>
        </div>

        <div
          className="h-7 w-px"
          style={{ background: "var(--color-gp-line)" }}
        />

        {/* Toolbar buttons */}
        <div className="flex items-center gap-1">
          <ToolbarButton onClick={newScript}>New</ToolbarButton>
          <ToolbarButton onClick={openFromDisk}>Open</ToolbarButton>
          <ToolbarButton onClick={saveToDisk}>Save</ToolbarButton>
          <ToolbarButton onClick={saveAs}>Save As</ToolbarButton>
        </div>

        {/* Script name + dirty marker (centered) */}
        <div className="flex-1 flex justify-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 border rounded-sm"
            style={{
              borderColor: "var(--color-gp-line)",
              background: "var(--color-gp-surface)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: script.dirty
                  ? "var(--color-gp-amber)"
                  : "var(--color-gp-phosphor)",
                boxShadow: script.dirty
                  ? "0 0 8px var(--color-gp-amber)"
                  : "0 0 6px var(--color-gp-phosphor)",
              }}
              aria-hidden
            />
            <span
              className="text-xs truncate max-w-[420px]"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--color-gp-paper-dim)",
                letterSpacing: "0.05em",
              }}
            >
              {script.name}
              {script.dirty ? " •" : ""}
            </span>
          </div>
        </div>

        <ToolbarButton onClick={() => setSettingsOpen(true)}>
          Settings
        </ToolbarButton>
        <button
          onClick={onGo}
          className="gp-btn-live"
          style={{ borderRadius: "2px" }}
        >
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{
              background: "var(--color-gp-ink)",
            }}
            aria-hidden
          />
          Go Live
        </button>
      </header>

      {/* ================= MAIN WORKAREA ================= */}
      <main className="relative flex-1 min-h-0 grid grid-cols-2 gap-px"
        style={{ background: "var(--color-gp-line)" }}
      >
        {/* Editor panel */}
        <section
          className="relative flex flex-col min-h-0 gp-reveal gp-reveal-2"
          style={{ background: "var(--color-gp-surface)" }}
        >
          <PanelHeader code="CH.01" label="SCRIPT" tone="phosphor" />
          <Frame className="flex-1 min-h-0 flex mx-3 mb-3">
            <MarkdownEditor />
          </Frame>
        </section>

        {/* Preview panel */}
        <section
          className="relative flex flex-col min-h-0 gp-reveal gp-reveal-3"
          style={{ background: "var(--color-gp-surface)" }}
        >
          <PanelHeader code="CH.02" label="PREVIEW" tone="amber" />
          <Frame className="flex-1 min-h-0 flex flex-col mx-3 mb-3">
            <div
              className="flex-1 min-h-0 overflow-auto gp-scroll px-8 py-8"
            >
              <MarkdownPreview content={script.content} />
            </div>
          </Frame>
        </section>
      </main>

      {/* ================= STATUS BAR ================= */}
      <footer
        className="flex items-center gap-8 px-6 h-20 border-t gp-reveal gp-reveal-4"
        style={{
          borderColor: "var(--color-gp-line)",
          background: "var(--color-gp-surface-2)",
        }}
      >
        <StatBlock label="WORDS" value={stats.words} />
        <Divider />
        <StatBlock label="CHARS" value={stats.chars} />
        <Divider />
        <StatBlock
          label="READ TIME"
          value={stats.duration}
          hint="at 150 wpm"
        />
        <Divider />
        <div className="flex items-center gap-3">
          <span
            className="text-[10px] tracking-[0.22em] uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--color-gp-mute)",
            }}
          >
            SIGNAL
          </span>
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background: "var(--color-gp-phosphor)",
              boxShadow: "0 0 10px var(--color-gp-phosphor)",
            }}
            aria-hidden
          />
          <span
            className="text-xs"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--color-gp-paper-dim)",
              letterSpacing: "0.1em",
            }}
          >
            READY
          </span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
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
    <div
      className="relative w-9 h-9 grid place-items-center"
      aria-hidden
      style={{
        border: "1px solid var(--color-gp-amber)",
        boxShadow:
          "0 0 0 1px rgba(255,160,51,0.15), 0 0 20px rgba(255,160,51,0.2)",
      }}
    >
      <span
        className="block w-3 h-3"
        style={{
          background: "var(--color-gp-amber)",
          boxShadow: "0 0 12px var(--color-gp-amber)",
        }}
      />
      <span
        className="absolute -top-1 -left-1 w-2 h-2"
        style={{ borderTop: "1px solid var(--color-gp-amber)", borderLeft: "1px solid var(--color-gp-amber)" }}
      />
      <span
        className="absolute -top-1 -right-1 w-2 h-2"
        style={{ borderTop: "1px solid var(--color-gp-amber)", borderRight: "1px solid var(--color-gp-amber)" }}
      />
      <span
        className="absolute -bottom-1 -left-1 w-2 h-2"
        style={{ borderBottom: "1px solid var(--color-gp-amber)", borderLeft: "1px solid var(--color-gp-amber)" }}
      />
      <span
        className="absolute -bottom-1 -right-1 w-2 h-2"
        style={{ borderBottom: "1px solid var(--color-gp-amber)", borderRight: "1px solid var(--color-gp-amber)" }}
      />
    </div>
  );
}

function PanelHeader({
  code,
  label,
  tone,
}: {
  code: string;
  label: string;
  tone: "phosphor" | "amber" | "mute";
}) {
  return (
    <div className="flex items-center justify-between px-6 h-9">
      <ChannelLabel code={code} label={label} tone={tone} />
      <span
        className="text-[9px] tracking-[0.25em]"
        style={{
          fontFamily: "var(--font-mono)",
          color: "var(--color-gp-mute-2)",
        }}
      >
        ━━━━━
      </span>
    </div>
  );
}

function Divider() {
  return (
    <span
      className="h-10 w-px"
      style={{ background: "var(--color-gp-line)" }}
      aria-hidden
    />
  );
}

function KbdHint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-2 text-[10px]"
      style={{
        fontFamily: "var(--font-mono)",
        color: "var(--color-gp-mute)",
      }}
    >
      {keys.map((k) => (
        <kbd
          key={k}
          className="inline-block px-1.5 py-0.5 border text-[10px]"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--color-gp-paper-dim)",
            borderColor: "var(--color-gp-line)",
            background: "var(--color-gp-surface)",
            borderRadius: 2,
          }}
        >
          {k}
        </kbd>
      ))}
      <span className="uppercase tracking-[0.1em]">{label}</span>
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
    <button onClick={onClick} className="gp-btn" style={{ borderRadius: "2px" }}>
      {children}
    </button>
  );
}
