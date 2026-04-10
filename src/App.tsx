import { useEffect, useRef, useState } from "react";
import { EditorView } from "@/editor/EditorView";
import { TeleprompterView } from "@/teleprompter/TeleprompterView";
import { useModeStore } from "@/store/modeStore";
import { useScriptStore } from "@/store/scriptStore";
import { useSettingsStore } from "@/store/settingsStore";
import { onHotkey, onModeChanged } from "@/lib/events";
import { ipc } from "@/lib/ipc";
import { getWindowRole } from "@/lib/windowRole";

export default function App() {
  const windowRole = getWindowRole();
  const mode = useModeStore((s) => s.mode);
  const editMode = useModeStore((s) => s.editMode);
  const setMode = useModeStore((s) => s.setMode);
  const setEditMode = useModeStore((s) => s.setEditMode);
  const setPlaying = useModeStore((s) => s.setPlaying);
  const setHidden = useModeStore((s) => s.setHidden);
  const togglePlaying = useModeStore((s) => s.togglePlaying);
  const toggleHidden = useModeStore((s) => s.toggleHidden);
  const setScript = useScriptStore((s) => s.setScript);
  const loadSettings = useSettingsStore((s) => s.load);
  const settingsLoaded = useSettingsStore((s) => s.loaded);
  const update = useSettingsStore((s) => s.update);
  const activeMode = windowRole === "overlay" ? "teleprompter" : mode;
  const [overlayScriptLoaded, setOverlayScriptLoaded] = useState(
    windowRole !== "overlay",
  );
  const overlayReady =
    windowRole !== "overlay" || (settingsLoaded && overlayScriptLoaded);

  // Refs so hotkey handlers always see the latest store values without re-registering listeners.
  const modeRef = useRef(activeMode);
  const editModeRef = useRef(editMode);
  useEffect(() => {
    modeRef.current = activeMode;
  }, [activeMode]);
  useEffect(() => {
    editModeRef.current = editMode;
  }, [editMode]);

  useEffect(() => {
    document.body.classList.remove("mode-editor", "mode-teleprompter");
    document.body.classList.add(`mode-${activeMode}`);
  }, [activeMode]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (windowRole !== "overlay") return;

    let cancelled = false;
    setOverlayScriptLoaded(false);
    setMode("teleprompter");
    setEditMode(true);
    setPlaying(false);
    setHidden(false);
    void ipc.setEditMode(true).catch((error) => {
      console.error("failed to enable overlay edit mode", error);
    });

    void ipc
      .getLiveScript()
      .then((script) => {
        if (cancelled) return;
        setScript(script);
      })
      .catch((error) => {
        console.error("failed to load live script", error);
      })
      .finally(() => {
        if (!cancelled) setOverlayScriptLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [windowRole, setEditMode, setHidden, setMode, setPlaying, setScript]);

  useEffect(() => {
    if (activeMode !== "teleprompter" || !overlayReady) return;

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
        } catch (e) {
          console.error("unregister hotkeys failed (continuing exit)", e);
        }
        try {
          await ipc.exitTeleprompter();
        } catch (e) {
          console.error("exit teleprompter failed", e);
        }
        setPlaying(false);
        setEditMode(false);
        setMode("editor");
      }),
    );

    return () => {
      unlistens.forEach((p) => p.then((fn) => fn()).catch(() => {}));
    };
  }, [activeMode, overlayReady, setMode, setEditMode, setPlaying, togglePlaying, toggleHidden, update]);

  if (activeMode === "teleprompter" && !overlayReady) {
    return null;
  }

  return activeMode === "editor" ? <EditorView /> : <TeleprompterView />;
}
