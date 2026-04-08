import { useState } from "react";
import { useScriptStore } from "@/store/scriptStore";
import { useModeStore } from "@/store/modeStore";
import { useSettingsStore } from "@/store/settingsStore";
import { ipc } from "@/lib/ipc";
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
    <div className="flex flex-col h-full bg-ghost-panel text-ghost-text">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-ghost-border bg-ghost-panel-2">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md"
            style={{
              background:
                "linear-gradient(135deg, var(--color-ghost-accent), var(--color-ghost-accent-2))",
            }}
          />
          <span className="font-bold tracking-tight">GhostPrompter</span>
        </div>
        <div className="mx-3 h-5 w-px bg-ghost-border" />
        <ToolbarButton onClick={newScript}>New</ToolbarButton>
        <ToolbarButton onClick={openFromDisk}>Open</ToolbarButton>
        <ToolbarButton onClick={saveToDisk}>Save</ToolbarButton>
        <ToolbarButton onClick={saveAs}>Save As</ToolbarButton>
        <div className="flex-1 text-center text-ghost-muted text-sm truncate px-2">
          {script.name}
          {script.dirty ? " •" : ""}
        </div>
        <ToolbarButton onClick={() => setSettingsOpen(true)}>Settings</ToolbarButton>
        <button
          onClick={onGo}
          className="px-4 py-1.5 rounded-md text-sm font-semibold text-black"
          style={{
            background:
              "linear-gradient(135deg, var(--color-ghost-accent), var(--color-ghost-accent-2))",
          }}
        >
          Go →
        </button>
      </header>

      <main className="grid grid-cols-2 flex-1 min-h-0">
        <div className="border-r border-ghost-border min-h-0">
          <MarkdownEditor />
        </div>
        <div className="overflow-auto p-6 min-h-0 bg-ghost-panel">
          <MarkdownPreview content={script.content} />
        </div>
      </main>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
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
    <button
      onClick={onClick}
      className="px-3 py-1.5 text-sm rounded-md bg-ghost-panel text-ghost-text border border-ghost-border hover:bg-ghost-panel-2 transition-colors"
    >
      {children}
    </button>
  );
}
