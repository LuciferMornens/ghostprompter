import { create } from "zustand";
import { open, save } from "@tauri-apps/plugin-dialog";
import { ipc } from "@/lib/ipc";
import type { Script } from "@/types";

type ScriptStore = {
  script: Script;
  setContent: (content: string) => void;
  openFromDisk: () => Promise<void>;
  saveToDisk: () => Promise<void>;
  saveAs: () => Promise<void>;
  newScript: () => void;
};

const EMPTY: Script = {
  path: null,
  name: "Untitled.md",
  content:
    "# Welcome to GhostPrompter\n\nWrite your **YouTube script** here in markdown.\n\n- Press **Go** to enter teleprompter mode\n- F7 to play/pause, F8/F9 for speed, F6 to toggle edit mode, Esc to exit\n- The teleprompter window is invisible to OBS, Zoom, Discord, and any screen capture\n\n## Intro\n\nHey everyone, welcome back to the channel...\n",
  dirty: false,
};

export const useScriptStore = create<ScriptStore>((set, get) => ({
  script: EMPTY,
  setContent: (content) =>
    set((s) => ({
      script: { ...s.script, content, dirty: content !== s.script.content ? true : s.script.dirty },
    })),
  openFromDisk: async () => {
    const selected = await open({
      multiple: false,
      filters: [
        { name: "Markdown / Text", extensions: ["md", "markdown", "txt"] },
      ],
    });
    if (!selected || typeof selected !== "string") return;
    const script = await ipc.readScript(selected);
    set({ script });
  },
  saveToDisk: async () => {
    const { script } = get();
    let path = script.path;
    if (!path) {
      const chosen = await save({
        defaultPath: script.name,
        filters: [{ name: "Markdown", extensions: ["md"] }],
      });
      if (!chosen) return;
      path = chosen;
    }
    const saved = await ipc.saveScript(path, script.content);
    set({
      script: {
        ...script,
        path: saved,
        name: saved.split(/[\\/]/).pop() ?? script.name,
        dirty: false,
      },
    });
  },
  saveAs: async () => {
    const { script } = get();
    const chosen = await save({
      defaultPath: script.name,
      filters: [{ name: "Markdown", extensions: ["md"] }],
    });
    if (!chosen) return;
    const saved = await ipc.saveScript(chosen, script.content);
    set({
      script: {
        ...script,
        path: saved,
        name: saved.split(/[\\/]/).pop() ?? script.name,
        dirty: false,
      },
    });
  },
  newScript: () => set({ script: EMPTY }),
}));
