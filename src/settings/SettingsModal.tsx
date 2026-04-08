import { useEffect, useState } from "react";
import { useSettingsStore } from "@/store/settingsStore";
import { DEFAULT_HOTKEYS, type Hotkeys } from "@/types";
import { HotkeyRecorder } from "./HotkeyRecorder";
import { ipc } from "@/lib/ipc";
import { ChannelLabel } from "@/ui/ChannelLabel";
import { Frame } from "@/ui/Frame";

type Tab = "appearance" | "playback" | "hotkeys" | "about";

const TABS: Array<[Tab, string, string]> = [
  ["appearance", "Appearance", "CH.A"],
  ["playback", "Playback", "CH.B"],
  ["hotkeys", "Hotkeys", "CH.C"],
  ["about", "About", "CH.D"],
];

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const reset = useSettingsStore((s) => s.reset);
  const [tab, setTab] = useState<Tab>("appearance");
  const [captureSupported, setCaptureSupported] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    ipc
      .isCaptureInvisibleSupported()
      .then(setCaptureSupported)
      .catch(() => {
        setCaptureSupported(false);
      });
  }, []);

  const setHotkey = (key: keyof Hotkeys) => (value: string) =>
    update({ hotkeys: { ...settings.hotkeys, [key]: value } });

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      onClick={onClose}
      style={{
        background: "rgba(8,8,10,0.72)",
        backdropFilter: "blur(6px)",
      }}
    >
      <Frame
        className="w-[820px] max-h-[85vh] flex flex-col overflow-hidden"
        style={{
          background: "var(--color-gp-surface)",
          border: "1px solid var(--color-gp-line-strong)",
          boxShadow:
            "0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,160,51,0.12), 0 0 80px rgba(255,160,51,0.08)",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex flex-col min-h-0 flex-1"
        >
          {/* ========= Modal header ========= */}
          <header
            className="flex items-center justify-between px-6 h-12 border-b"
            style={{
              borderColor: "var(--color-gp-line)",
              background: "var(--color-gp-surface-2)",
            }}
          >
            <div className="flex items-center gap-3">
              <ChannelLabel code="SYS" label="CONFIG" tone="amber" />
              <h2
                className="text-sm"
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                }}
              >
                Settings
              </h2>
            </div>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center"
              style={{
                width: 24,
                height: 24,
                border: "1px solid var(--color-gp-line)",
                color: "var(--color-gp-mute)",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                background: "transparent",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </header>

          {/* ========= Body ========= */}
          <div className="flex flex-1 min-h-0">
            {/* Tabs rail */}
            <nav
              className="w-48 border-r p-3 flex flex-col gap-1"
              style={{
                borderColor: "var(--color-gp-line)",
                background: "var(--color-gp-surface)",
              }}
            >
              <div
                className="px-2 py-2 mb-1 text-[9px] tracking-[0.22em] uppercase"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--color-gp-mute-2)",
                }}
              >
                Channels
              </div>
              {TABS.map(([id, label, code]) => {
                const active = tab === id;
                return (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className="relative text-left px-3 py-2 flex items-center gap-2"
                    style={{
                      border: `1px solid ${
                        active ? "var(--color-gp-amber)" : "transparent"
                      }`,
                      background: active
                        ? "rgba(255,160,51,0.06)"
                        : "transparent",
                      color: active
                        ? "var(--color-gp-amber)"
                        : "var(--color-gp-paper-dim)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                      borderRadius: 2,
                    }}
                  >
                    <span
                      aria-hidden
                      className="text-[9px]"
                      style={{ color: "var(--color-gp-mute-2)" }}
                    >
                      {code}
                    </span>
                    <span>{label}</span>
                    {active && (
                      <span
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-1 h-1"
                        style={{
                          background: "var(--color-gp-amber)",
                          boxShadow: "0 0 6px var(--color-gp-amber)",
                        }}
                      />
                    )}
                  </button>
                );
              })}

              <div className="flex-1" />
              <div
                className="px-2 pt-2 border-t text-[9px] tracking-[0.22em] uppercase"
                style={{
                  borderColor: "var(--color-gp-line)",
                  fontFamily: "var(--font-mono)",
                  color: "var(--color-gp-mute-2)",
                }}
              >
                GhostPrompter v0.1
              </div>
            </nav>

            {/* Tab content */}
            <div
              className="flex-1 p-6 overflow-auto gp-scroll"
              style={{
                background: "var(--color-gp-surface-2)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {tab === "appearance" && (
                <div className="space-y-6">
                  <SectionHeading>Typography</SectionHeading>
                  <Field
                    label="Font size"
                    value={`${settings.fontSize}px`}
                  >
                    <input
                      type="range"
                      min={18}
                      max={96}
                      value={settings.fontSize}
                      onChange={(e) =>
                        update({ fontSize: Number(e.target.value) })
                      }
                    />
                  </Field>
                  <Field
                    label="Line height"
                    value={settings.lineHeight.toFixed(2)}
                  >
                    <input
                      type="range"
                      min={1}
                      max={2.5}
                      step={0.05}
                      value={settings.lineHeight}
                      onChange={(e) =>
                        update({ lineHeight: Number(e.target.value) })
                      }
                    />
                  </Field>

                  <SectionHeading>Color</SectionHeading>
                  <div className="grid grid-cols-2 gap-6">
                    <FieldInline label="Text color">
                      <input
                        type="color"
                        value={settings.textColor}
                        onChange={(e) => update({ textColor: e.target.value })}
                      />
                    </FieldInline>
                    <FieldInline label="Background color">
                      <input
                        type="color"
                        value={settings.bgColor}
                        onChange={(e) => update({ bgColor: e.target.value })}
                      />
                    </FieldInline>
                  </div>
                  <Field
                    label="Background opacity"
                    value={`${Math.round(settings.bgOpacity * 100)}%`}
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
                    />
                  </Field>

                  <SectionHeading>Mirror</SectionHeading>
                  <div className="flex gap-6">
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
                <div className="space-y-6">
                  <SectionHeading>Scroll</SectionHeading>
                  <Field
                    label="Scroll speed"
                    value={`${settings.scrollSpeed} px/s`}
                  >
                    <input
                      type="range"
                      min={5}
                      max={200}
                      value={settings.scrollSpeed}
                      onChange={(e) =>
                        update({ scrollSpeed: Number(e.target.value) })
                      }
                    />
                  </Field>

                  <SectionHeading>Reading Line</SectionHeading>
                  <Field
                    label="Reading line position"
                    value={`${Math.round(
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
                        update({
                          readingLineOffset: Number(e.target.value),
                        })
                      }
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
                  <SectionHeading>Global Shortcuts</SectionHeading>
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
                  <div className="pt-3">
                    <button
                      onClick={() => update({ hotkeys: DEFAULT_HOTKEYS })}
                      className="text-[10px] underline"
                      style={{
                        color: "var(--color-gp-mute)",
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      reset hotkeys to defaults
                    </button>
                  </div>
                </div>
              )}

              {tab === "about" && (
                <div className="space-y-5">
                  <SectionHeading>System</SectionHeading>
                  <div
                    className="text-base"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      letterSpacing: "-0.01em",
                      color: "var(--color-gp-paper)",
                    }}
                  >
                    GhostPrompter 0.1.0
                  </div>
                  <p
                    className="text-xs leading-relaxed"
                    style={{
                      color: "var(--color-gp-paper-dim)",
                      fontFamily: "var(--font-mono)",
                      maxWidth: 520,
                    }}
                  >
                    Capture-invisible teleprompter. Your teleprompter window
                    is skipped by standard screen capture APIs on Windows and
                    macOS.
                  </p>

                  <SectionHeading>Capture Invisibility</SectionHeading>
                  <div className="flex items-center gap-3">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: captureSupported
                          ? "var(--color-gp-phosphor)"
                          : captureSupported === null
                            ? "var(--color-gp-mute-2)"
                            : "var(--color-gp-magenta)",
                        boxShadow: captureSupported
                          ? "0 0 8px var(--color-gp-phosphor)"
                          : "none",
                      }}
                    />
                    <span
                      className="text-xs uppercase tracking-[0.12em]"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: captureSupported
                          ? "var(--color-gp-phosphor)"
                          : captureSupported === null
                            ? "var(--color-gp-mute)"
                            : "var(--color-gp-magenta)",
                      }}
                    >
                      {captureSupported === null
                        ? "checking..."
                        : captureSupported
                          ? "supported"
                          : "not supported on this platform"}
                    </span>
                  </div>
                  <p
                    className="text-[11px]"
                    style={{
                      color: "var(--color-gp-mute)",
                      fontFamily: "var(--font-mono)",
                      maxWidth: 520,
                    }}
                  >
                    Windows 10 (build 19041+) or macOS 10.13+ required for
                    full invisibility.
                  </p>

                  <div className="pt-3">
                    <button
                      onClick={reset}
                      className="text-[10px] underline"
                      style={{
                        color: "var(--color-gp-mute)",
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      reset all settings to defaults
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Frame>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-3 pb-1"
      style={{
        borderBottom: "1px dashed var(--color-gp-line)",
      }}
    >
      <span
        className="w-1.5 h-1.5"
        style={{
          background: "var(--color-gp-amber)",
          boxShadow: "0 0 6px var(--color-gp-amber)",
        }}
      />
      <span
        className="text-[10px] tracking-[0.22em] uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          color: "var(--color-gp-paper-dim)",
        }}
      >
        {children}
      </span>
    </div>
  );
}

function Field({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[10px] tracking-[0.18em] uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--color-gp-mute)",
          }}
        >
          {label}: {value}
        </span>
      </div>
      {children}
    </label>
  );
}

function FieldInline({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span
        className="text-[10px] tracking-[0.18em] uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          color: "var(--color-gp-mute)",
        }}
      >
        {label}
      </span>
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
    <label
      className="flex items-center gap-2 cursor-pointer text-[11px] uppercase tracking-[0.1em]"
      style={{
        color: "var(--color-gp-paper-dim)",
        fontFamily: "var(--font-mono)",
      }}
    >
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
    <div
      className="flex items-center justify-between py-1.5 px-3"
      style={{
        background: "var(--color-gp-surface)",
        border: "1px solid var(--color-gp-line)",
        borderRadius: 2,
      }}
    >
      <span
        className="text-[11px] uppercase tracking-[0.08em]"
        style={{
          color: "var(--color-gp-paper-dim)",
          fontFamily: "var(--font-mono)",
        }}
      >
        {label}
      </span>
      <HotkeyRecorder value={value} onChange={onChange} />
    </div>
  );
}
