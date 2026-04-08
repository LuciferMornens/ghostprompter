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
      className={`px-3 py-1.5 text-sm rounded-md border min-w-32 text-left ${
        recording
          ? "border-ghost-accent text-ghost-accent"
          : "border-ghost-border text-ghost-text"
      } bg-ghost-panel hover:bg-ghost-panel-2`}
    >
      {recording ? "press keys..." : value}
    </button>
  );
}

function normalizeKey(key: string, code: string): string | null {
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
