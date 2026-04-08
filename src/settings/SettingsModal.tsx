import { useEffect, useState } from "react";
import { useSettingsStore } from "@/store/settingsStore";
import { DEFAULT_HOTKEYS, type Hotkeys } from "@/types";
import { HotkeyRecorder } from "./HotkeyRecorder";
import { ipc } from "@/lib/ipc";

type Tab = "appearance" | "playback" | "hotkeys" | "about";

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const reset = useSettingsStore((s) => s.reset);
  const [tab, setTab] = useState<Tab>("appearance");
  const [captureSupported, setCaptureSupported] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    ipc.isCaptureInvisibleSupported().then(setCaptureSupported).catch(() => {
      setCaptureSupported(false);
    });
  }, []);

  const setHotkey = (key: keyof Hotkeys) => (value: string) =>
    update({ hotkeys: { ...settings.hotkeys, [key]: value } });

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-ghost-panel border border-ghost-border rounded-xl w-[720px] max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-3 border-b border-ghost-border">
          <h2 className="font-bold">Settings</h2>
          <button
            onClick={onClose}
            className="text-ghost-muted hover:text-ghost-text text-lg"
          >
            ✕
          </button>
        </header>

        <div className="flex flex-1 min-h-0">
          <nav className="w-40 border-r border-ghost-border p-2 flex flex-col gap-1">
            {(
              [
                ["appearance", "Appearance"],
                ["playback", "Playback"],
                ["hotkeys", "Hotkeys"],
                ["about", "About"],
              ] as [Tab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`text-left px-3 py-1.5 rounded-md text-sm ${
                  tab === id
                    ? "bg-ghost-panel-2 text-ghost-text"
                    : "text-ghost-muted hover:text-ghost-text"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="flex-1 p-5 overflow-auto text-sm">
            {tab === "appearance" && (
              <div className="space-y-4">
                <Field label={`Font size: ${settings.fontSize}px`}>
                  <input
                    type="range"
                    min={18}
                    max={96}
                    value={settings.fontSize}
                    onChange={(e) =>
                      update({ fontSize: Number(e.target.value) })
                    }
                    className="w-full"
                  />
                </Field>
                <Field label={`Line height: ${settings.lineHeight.toFixed(2)}`}>
                  <input
                    type="range"
                    min={1}
                    max={2.5}
                    step={0.05}
                    value={settings.lineHeight}
                    onChange={(e) =>
                      update({ lineHeight: Number(e.target.value) })
                    }
                    className="w-full"
                  />
                </Field>
                <Field label="Text color">
                  <input
                    type="color"
                    value={settings.textColor}
                    onChange={(e) => update({ textColor: e.target.value })}
                  />
                </Field>
                <Field label="Background color">
                  <input
                    type="color"
                    value={settings.bgColor}
                    onChange={(e) => update({ bgColor: e.target.value })}
                  />
                </Field>
                <Field
                  label={`Background opacity: ${Math.round(settings.bgOpacity * 100)}%`}
                >
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings.bgOpacity}
                    onChange={(e) =>
                      update({ bgOpacity: Number(e.target.value) })
                    }
                    className="w-full"
                  />
                </Field>
                <div className="flex gap-4">
                  <Checkbox
                    label="Mirror horizontal"
                    checked={settings.mirrorHorizontal}
                    onChange={(v) => update({ mirrorHorizontal: v })}
                  />
                  <Checkbox
                    label="Mirror vertical"
                    checked={settings.mirrorVertical}
                    onChange={(v) => update({ mirrorVertical: v })}
                  />
                </div>
              </div>
            )}

            {tab === "playback" && (
              <div className="space-y-4">
                <Field
                  label={`Scroll speed: ${settings.scrollSpeed} px/s`}
                >
                  <input
                    type="range"
                    min={5}
                    max={200}
                    value={settings.scrollSpeed}
                    onChange={(e) =>
                      update({ scrollSpeed: Number(e.target.value) })
                    }
                    className="w-full"
                  />
                </Field>
                <Field
                  label={`Reading line position: ${Math.round(
                    settings.readingLineOffset * 100,
                  )}% from top`}
                >
                  <input
                    type="range"
                    min={0.1}
                    max={0.9}
                    step={0.05}
                    value={settings.readingLineOffset}
                    onChange={(e) =>
                      update({ readingLineOffset: Number(e.target.value) })
                    }
                    className="w-full"
                  />
                </Field>
                <Checkbox
                  label="Highlight reading line"
                  checked={settings.highlightReadingLine}
                  onChange={(v) => update({ highlightReadingLine: v })}
                />
              </div>
            )}

            {tab === "hotkeys" && (
              <div className="space-y-3">
                <HotkeyRow
                  label="Play / Pause"
                  value={settings.hotkeys.playPause}
                  onChange={setHotkey("playPause")}
                />
                <HotkeyRow
                  label="Slower"
                  value={settings.hotkeys.slower}
                  onChange={setHotkey("slower")}
                />
                <HotkeyRow
                  label="Faster"
                  value={settings.hotkeys.faster}
                  onChange={setHotkey("faster")}
                />
                <HotkeyRow
                  label="Hide / Show"
                  value={settings.hotkeys.hideShow}
                  onChange={setHotkey("hideShow")}
                />
                <HotkeyRow
                  label="Toggle edit mode"
                  value={settings.hotkeys.toggleEditMode}
                  onChange={setHotkey("toggleEditMode")}
                />
                <HotkeyRow
                  label="Line up"
                  value={settings.hotkeys.lineUp}
                  onChange={setHotkey("lineUp")}
                />
                <HotkeyRow
                  label="Line down"
                  value={settings.hotkeys.lineDown}
                  onChange={setHotkey("lineDown")}
                />
                <HotkeyRow
                  label="Jump to start"
                  value={settings.hotkeys.jumpStart}
                  onChange={setHotkey("jumpStart")}
                />
                <HotkeyRow
                  label="Jump to end"
                  value={settings.hotkeys.jumpEnd}
                  onChange={setHotkey("jumpEnd")}
                />
                <HotkeyRow
                  label="Stop / Exit"
                  value={settings.hotkeys.stop}
                  onChange={setHotkey("stop")}
                />
                <div className="pt-2">
                  <button
                    onClick={() => update({ hotkeys: DEFAULT_HOTKEYS })}
                    className="text-xs text-ghost-muted underline"
                  >
                    reset hotkeys to defaults
                  </button>
                </div>
              </div>
            )}

            {tab === "about" && (
              <div className="space-y-3 text-ghost-muted">
                <p className="text-ghost-text font-semibold">GhostPrompter 0.1.0</p>
                <p>
                  Capture-invisible teleprompter. Your teleprompter window is
                  skipped by standard screen capture APIs on Windows and macOS.
                </p>
                <p>
                  Capture invisibility:{" "}
                  <span
                    className={
                      captureSupported
                        ? "text-ghost-accent"
                        : "text-red-400"
                    }
                  >
                    {captureSupported === null
                      ? "checking..."
                      : captureSupported
                        ? "supported"
                        : "not supported on this platform"}
                  </span>
                </p>
                <p>
                  Windows 10 (build 19041+) or macOS 10.13+ required for full
                  invisibility.
                </p>
                <div className="pt-3">
                  <button
                    onClick={reset}
                    className="text-xs text-ghost-muted underline"
                  >
                    reset all settings to defaults
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-ghost-muted text-xs mb-1">{label}</div>
      {children}
    </label>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-ghost-text cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function HotkeyRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ghost-text">{label}</span>
      <HotkeyRecorder value={value} onChange={onChange} />
    </div>
  );
}
