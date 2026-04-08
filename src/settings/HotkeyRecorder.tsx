import { useState } from "react";

type Props = {
  value: string;
  onChange: (next: string) => void;
};

export function HotkeyRecorder({ value, onChange }: Props) {
  const [recording, setRecording] = useState(false);

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!recording) return;
    e.preventDefault();
    e.stopPropagation();

    const parts: string[] = [];
    if (e.ctrlKey) parts.push("Control");
    if (e.shiftKey) parts.push("Shift");
    if (e.altKey) parts.push("Alt");
    if (e.metaKey) parts.push("Super");

    const key = normalizeKey(e.key, e.code);
    if (!key) return;
    if (["Control", "Shift", "Alt", "Meta"].includes(key)) return;

    parts.push(key);
    onChange(parts.join("+"));
    setRecording(false);
  };

  return (
    <button
      type="button"
      onClick={() => setRecording((r) => !r)}
      onKeyDown={onKeyDown}
      className="inline-block text-left"
      style={{
        minWidth: 160,
        padding: "6px 10px",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        letterSpacing: "0.05em",
        textTransform: "none",
        color: recording ? "var(--color-gp-amber)" : "var(--color-gp-paper)",
        background: recording
          ? "rgba(255,160,51,0.08)"
          : "var(--color-gp-ink)",
        border: `1px solid ${
          recording ? "var(--color-gp-amber)" : "var(--color-gp-line)"
        }`,
        borderRadius: 2,
        cursor: "pointer",
        boxShadow: recording
          ? "0 0 0 1px rgba(255,160,51,0.3), 0 0 12px rgba(255,160,51,0.15)"
          : "none",
      }}
    >
      {recording ? "press keys..." : value}
    </button>
  );
}

function normalizeKey(key: string, code: string): string | null {
  // Map special keys first, BEFORE length-1 fallback, so that Space (key=" ") → "Space"
  const map: Record<string, string> = {
    " ": "Space",
    ArrowUp: "Up",
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
    Escape: "Escape",
    Enter: "Enter",
    Tab: "Tab",
    Home: "Home",
    End: "End",
    PageUp: "PageUp",
    PageDown: "PageDown",
    Backspace: "Backspace",
    Delete: "Delete",
  };
  if (map[key]) return map[key];
  if (key.length === 1) return key.toUpperCase();
  if (/^F\d+$/.test(key)) return key;
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  return null;
}
