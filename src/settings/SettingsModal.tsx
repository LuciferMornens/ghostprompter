import { useEffect, useState } from "react";
import { useSettingsStore } from "@/store/settingsStore";
import { DEFAULT_HOTKEYS, type Hotkeys } from "@/types";
import { HotkeyRecorder } from "./HotkeyRecorder";
import { ipc } from "@/lib/ipc";

type Tab = "appearance" | "playback" | "hotkeys" | "about";

const TABS: Array<[Tab, string, string]> = [
  ["appearance", "Appearance", "typography, color, mirror"],
  ["playback", "Playback", "scroll, reading line"],
  ["hotkeys", "Hotkeys", "global shortcuts"],
  ["about", "About", "system, capture status"],
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
        background: "rgba(5,5,6,0.68)",
        backdropFilter: "blur(12px) saturate(115%)",
        WebkitBackdropFilter: "blur(12px) saturate(115%)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="gp-glass gp-glass-sheen w-[880px] max-h-[86vh] flex flex-col overflow-hidden gp-scale-in"
        style={{
          borderRadius: 24,
          background: "rgba(13, 13, 15, 0.78)",
        }}
      >
        {/* ========= Modal header ========= */}
        <header
          className="flex items-center justify-between px-8 h-16"
          style={{ borderBottom: "1px solid rgba(241,237,228,0.07)" }}
        >
          <div className="flex items-center gap-3.5">
            <span
              aria-hidden
              style={{
                display: "inline-block",
                width: 5,
                height: 5,
                background: "var(--color-gp-bronze)",
                boxShadow:
                  "0 0 9px rgba(199,138,74,0.65), 0 0 16px rgba(224,164,106,0.38)",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 15.5,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "var(--color-gp-paper)",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "inherit" }}>Settings</h2>
            </span>
            <span
              className="ml-1"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9.5,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--color-gp-paper-dim-2)",
              }}
            >
              preferences
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="✕"
            className="gp-close"
          >
            ✕
          </button>
        </header>

        {/* ========= Body ========= */}
        <div className="flex flex-1 min-h-0">
          {/* Tabs rail */}
          <nav
            className="w-60 p-4 flex flex-col gap-1"
            style={{ borderRight: "1px solid rgba(241,237,228,0.06)" }}
          >
            {TABS.map(([id, label, hint]) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`gp-tab ${active ? "gp-tab--active" : ""}`.trim()}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      letterSpacing: "-0.008em",
                    }}
                  >
                    {label}
                  </span>
                  <span
                    aria-hidden
                    style={{
                      fontSize: 10,
                      fontFamily: "var(--font-mono)",
                      color: "var(--color-gp-paper-dim-2)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {hint}
                  </span>
                  {active && <span aria-hidden className="gp-tab__beam" />}
                </button>
              );
            })}

            <div className="flex-1" />
            <div
              className="px-3 pt-3 mt-1 text-[10px]"
              style={{
                borderTop: "1px solid rgba(241,237,228,0.06)",
                fontFamily: "var(--font-mono)",
                color: "var(--color-gp-mute)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Ghostprompter v0.1
            </div>
          </nav>

          {/* Tab content */}
          <div
            className="flex-1 overflow-auto gp-scroll"
            style={{ padding: "32px 36px" }}
          >
            {tab === "appearance" && (
              <div className="space-y-8">
                <Section title="Typography">
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
                </Section>

                <Section title="Color">
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
                </Section>

                <Section title="Mirror">
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
                </Section>
              </div>
            )}

            {tab === "playback" && (
              <div className="space-y-8">
                <Section title="Scroll">
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
                </Section>

                <Section title="Reading line">
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
                </Section>
              </div>
            )}

            {tab === "hotkeys" && (
              <div className="space-y-4">
                <Section title="Global shortcuts">
                  <div className="flex flex-col gap-2">
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
                  </div>
                </Section>
                <div>
                  <button
                    onClick={() => update({ hotkeys: DEFAULT_HOTKEYS })}
                    style={{
                      color: "var(--color-gp-paper-dim-2)",
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      textDecoration: "underline",
                      textDecorationColor: "rgba(241,237,228,0.2)",
                      textUnderlineOffset: 3,
                    }}
                  >
                    reset hotkeys to defaults
                  </button>
                </div>
              </div>
            )}

            {tab === "about" && (
              <div className="space-y-6">
                <Section title="System">
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 600,
                      fontSize: 17,
                      letterSpacing: "-0.02em",
                      color: "var(--color-gp-paper)",
                    }}
                  >
                    GhostPrompter 0.1.0
                  </div>
                  <p
                    style={{
                      color: "var(--color-gp-paper-dim)",
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      lineHeight: 1.65,
                      maxWidth: 560,
                      marginTop: 10,
                    }}
                  >
                    A quiet, capture-invisible teleprompter. Your teleprompter
                    window is skipped by standard screen-capture APIs on Windows
                    and macOS — invisible to OBS, Zoom, Discord, and any other
                    capture tool that respects the platform flag.
                  </p>
                </Section>

                <Section title="Capture invisibility">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        background:
                          captureSupported === null
                            ? "rgba(241,237,228,0.22)"
                            : captureSupported
                              ? "var(--color-gp-mint)"
                              : "var(--color-gp-sunset)",
                        boxShadow:
                          captureSupported === true
                            ? "0 0 9px rgba(138,184,146,0.7)"
                            : captureSupported === false
                              ? "0 0 9px rgba(215,122,85,0.65)"
                              : "none",
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 12,
                        fontWeight: 500,
                        color:
                          captureSupported === null
                            ? "var(--color-gp-paper-dim-2)"
                            : captureSupported
                              ? "var(--color-gp-mint)"
                              : "var(--color-gp-sunset)",
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
                    style={{
                      color: "var(--color-gp-paper-dim-2)",
                      fontFamily: "var(--font-sans)",
                      fontSize: 11.5,
                      lineHeight: 1.6,
                      maxWidth: 560,
                      marginTop: 8,
                    }}
                  >
                    Windows 10 (build 19041+) or macOS 10.13+ required for full
                    invisibility.
                  </p>
                </Section>

                <div className="pt-2">
                  <button
                    onClick={reset}
                    style={{
                      color: "var(--color-gp-paper-dim-2)",
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      textDecoration: "underline",
                      textDecorationColor: "rgba(241,237,228,0.2)",
                      textUnderlineOffset: 3,
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
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--color-gp-paper)",
          }}
        >
          {title}
        </span>
        <span
          className="flex-1"
          style={{
            height: 1,
            background:
              "linear-gradient(90deg, rgba(199,138,74,0.32), transparent)",
          }}
          aria-hidden
        />
      </div>
      <div className="space-y-6">{children}</div>
    </section>
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
      <div className="flex items-center justify-between mb-3">
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            fontWeight: 500,
            color: "var(--color-gp-paper-dim)",
            letterSpacing: "-0.005em",
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
    <label
      className="flex items-center justify-between gap-3 px-4 py-3.5"
      style={{
        background: "rgba(241,237,228,0.024)",
        border: "1px solid rgba(241,237,228,0.06)",
        borderRadius: 11,
        boxShadow: "inset 0 1px 0 rgba(255,240,220,0.035)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          fontWeight: 500,
          color: "var(--color-gp-paper-dim)",
          letterSpacing: "-0.005em",
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
      className="flex items-center gap-2.5 cursor-pointer"
      style={{
        color: "var(--color-gp-paper-dim)",
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        fontWeight: 500,
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
      className="flex items-center justify-between gap-4 px-4 py-3"
      style={{
        background: "rgba(241,237,228,0.022)",
        border: "1px solid rgba(241,237,228,0.06)",
        borderRadius: 11,
        boxShadow: "inset 0 1px 0 rgba(255,240,220,0.035)",
        transition: "border-color 200ms var(--gp-ease-swift)",
      }}
    >
      <span
        style={{
          color: "var(--color-gp-paper-dim)",
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: "-0.005em",
        }}
      >
        {label}
      </span>
      <HotkeyRecorder value={value} onChange={onChange} />
    </div>
  );
}
