import { useEffect, useRef } from "react";
import { EditorView } from "@/editor/EditorView";
import { TeleprompterView } from "@/teleprompter/TeleprompterView";
import { useModeStore } from "@/store/modeStore";
import { useSettingsStore } from "@/store/settingsStore";
import { onHotkey, onModeChanged } from "@/lib/events";
import { ipc } from "@/lib/ipc";

export default function App() {
  const mode = useModeStore((s) => s.mode);
  const editMode = useModeStore((s) => s.editMode);
  const setMode = useModeStore((s) => s.setMode);
  const setEditMode = useModeStore((s) => s.setEditMode);
  const setPlaying = useModeStore((s) => s.setPlaying);
  const togglePlaying = useModeStore((s) => s.togglePlaying);
  const toggleHidden = useModeStore((s) => s.toggleHidden);
  const loadSettings = useSettingsStore((s) => s.load);
  const update = useSettingsStore((s) => s.update);

  // Refs so hotkey handlers always see the latest store values without re-registering listeners.
  const modeRef = useRef(mode);
  const editModeRef = useRef(editMode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    editModeRef.current = editMode;
  }, [editMode]);

  useEffect(() => {
    document.body.classList.remove("mode-editor", "mode-teleprompter");
    document.body.classList.add(`mode-${mode}`);
  }, [mode]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    const unlistens: Array<Promise<() => void>> = [];

    unlistens.push(
      onModeChanged((m, edit) => {
        setMode(m);
        setEditMode(edit);
      }),
    );

    unlistens.push(onHotkey("play-pause", () => togglePlaying()));
    unlistens.push(
      onHotkey("slower", async () => {
        const s = useSettingsStore.getState().settings;
        await update({ scrollSpeed: Math.max(5, s.scrollSpeed - 5) });
      }),
    );
    unlistens.push(
      onHotkey("faster", async () => {
        const s = useSettingsStore.getState().settings;
        await update({ scrollSpeed: Math.min(500, s.scrollSpeed + 5) });
      }),
    );
    unlistens.push(onHotkey("hide", () => toggleHidden()));
    unlistens.push(
      onHotkey("edit-mode", async () => {
        if (modeRef.current !== "teleprompter") return;
        const next = !editModeRef.current;
        setEditMode(next);
        await ipc.setEditMode(next);
      }),
    );
    unlistens.push(
      onHotkey("stop", async () => {
        if (modeRef.current !== "teleprompter") return;
        try {
          await ipc.unregisterHotkeys();
          await ipc.exitTeleprompter();
          setPlaying(false);
          setEditMode(false);
          setMode("editor");
        } catch (e) {
          console.error(e);
        }
      }),
    );

    return () => {
      unlistens.forEach((p) => p.then((fn) => fn()).catch(() => {}));
    };
  }, [setMode, setEditMode, setPlaying, togglePlaying, toggleHidden, update]);

  return mode === "editor" ? <EditorView /> : <TeleprompterView />;
}
