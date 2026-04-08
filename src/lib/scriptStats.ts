// Pure helpers for computing script statistics shown in the editor HUD and
// the teleprompter status bar. Kept intentionally side-effect free and
// framework-agnostic so they can be unit-tested in isolation.

const DEFAULT_WPM = 150;

const STRIP_PATTERNS: RegExp[] = [
  /`{1,3}[^`]*`{1,3}/g, // inline code / fenced code
  /!\[[^\]]*]\([^)]*\)/g, // images
  /\[([^\]]+)]\([^)]*\)/g, // links → keep visible text below
  /[#>*_~`]/g, // markdown punctuation
  /<[^>]+>/g, // raw html tags
];

function stripMarkdown(text: string): string {
  let out = text;
  // Keep the visible text of [text](url) links
  out = out.replace(/\[([^\]]+)]\([^)]*\)/g, "$1");
  // Then apply remaining strips
  for (const re of STRIP_PATTERNS) {
    out = out.replace(re, " ");
  }
  return out;
}

export function countWords(text: string): number {
  const stripped = stripMarkdown(text).trim();
  if (stripped.length === 0) return 0;
  return stripped.split(/\s+/u).filter((t) => t.length > 0).length;
}

export function countChars(text: string): number {
  if (text.length === 0) return 0;
  // Use the iterator to count by Unicode codepoint, not UTF-16 code unit.
  let n = 0;
  for (const _ of text) n++;
  return n;
}

export function estimateReadingSeconds(words: number, wpm: number): number {
  if (words <= 0) return 0;
  const effectiveWpm = wpm > 0 ? wpm : DEFAULT_WPM;
  // Multiply first to avoid floating-point errors on values like 41/40 * 60
  // (which yields 61.4999… and would round down).
  return Math.round((words * 60) / effectiveWpm);
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const ss = seconds.toString().padStart(2, "0");
  if (hours > 0) {
    const mm = minutes.toString().padStart(2, "0");
    return `${hours}:${mm}:${ss}`;
  }
  return `${minutes}:${ss}`;
}

export type ScriptStats = {
  words: number;
  chars: number;
  seconds: number;
  duration: string;
};

export function scriptStats(content: string, wpm = DEFAULT_WPM): ScriptStats {
  const words = countWords(content);
  const chars = countChars(content);
  const seconds = estimateReadingSeconds(words, wpm);
  return { words, chars, seconds, duration: formatDuration(seconds) };
}
