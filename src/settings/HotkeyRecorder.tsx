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
      className={`gp-hotkey-rec inline-block text-left ${
        recording ? "gp-hotkey-rec--recording" : ""
      }`.trim()}
    >
      {recording ? "press keys..." : value}
    </button>
  );
}

/** Map physical keyboard codes to their base (unshifted) key form. */
const CODE_TO_KEY: Record<string, string> = {
  Slash: "/",
  Period: ".",
  Comma: ",",
  Semicolon: ";",
  Quote: "'",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Minus: "-",
  Equal: "=",
  Backquote: "`",
  IntlBackslash: "\\",
};

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
  if (/^F\d+$/.test(key)) return key;

  // Resolve via physical key code so shifted symbols (! ? etc.) become
  // their base-key form (1 / etc.) that the Rust hotkey parser expects.
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (CODE_TO_KEY[code]) return CODE_TO_KEY[code];

  // Fallback for keys not covered above (e.g. numpad digits).
  if (key.length === 1) return key.toUpperCase();
  return null;
}
