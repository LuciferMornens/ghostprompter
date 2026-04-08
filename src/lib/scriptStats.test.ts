import { describe, expect, it } from "vitest";
import {
  countWords,
  countChars,
  estimateReadingSeconds,
  formatDuration,
  scriptStats,
} from "./scriptStats";

describe("countWords", () => {
  it("returns 0 for empty string", () => {
    expect(countWords("")).toBe(0);
  });
  it("returns 0 for whitespace only", () => {
    expect(countWords("   \n\t  ")).toBe(0);
  });
  it("counts single word", () => {
    expect(countWords("Hello")).toBe(1);
  });
  it("counts multiple words separated by single spaces", () => {
    expect(countWords("hello world foo")).toBe(3);
  });
  it("collapses runs of whitespace", () => {
    expect(countWords("hello    world\n\n  foo")).toBe(3);
  });
  it("ignores markdown heading hashes as separate tokens but counts words next to them", () => {
    expect(countWords("# Title\n\nBody paragraph here.")).toBeGreaterThanOrEqual(4);
  });
  it("strips markdown heading/link syntax from the count", () => {
    // "# Hello" → 1 word, not 2 (the '#' is syntax, not a word)
    expect(countWords("# Hello")).toBe(1);
  });
  it("strips link syntax so only the visible text counts", () => {
    expect(countWords("See [the docs](https://example.com) now")).toBe(4);
  });
});

describe("countChars", () => {
  it("returns 0 for empty", () => {
    expect(countChars("")).toBe(0);
  });
  it("counts characters including spaces", () => {
    expect(countChars("hello world")).toBe(11);
  });
  it("counts unicode codepoints, not UTF-16 surrogate pairs", () => {
    // "😀" is 2 UTF-16 code units but 1 codepoint
    expect(countChars("😀")).toBe(1);
    expect(countChars("a😀b")).toBe(3);
  });
});

describe("estimateReadingSeconds", () => {
  it("returns 0 for 0 words", () => {
    expect(estimateReadingSeconds(0, 40)).toBe(0);
  });
  it("returns 60 seconds for 40 words at 40 wpm", () => {
    expect(estimateReadingSeconds(40, 40)).toBe(60);
  });
  it("scales linearly with word count", () => {
    expect(estimateReadingSeconds(80, 40)).toBe(120);
  });
  it("rounds to nearest integer second", () => {
    // 41 words at 40 wpm → 61.5 → 62
    expect(estimateReadingSeconds(41, 40)).toBe(62);
  });
  it("falls back to a reasonable default wpm when given 0 or negative", () => {
    // Must not divide by zero / must return a finite number
    const v = estimateReadingSeconds(100, 0);
    expect(Number.isFinite(v)).toBe(true);
    expect(v).toBeGreaterThan(0);
  });
});

describe("formatDuration", () => {
  it("formats 0 seconds as 0:00", () => {
    expect(formatDuration(0)).toBe("0:00");
  });
  it("formats under a minute with leading 0:", () => {
    expect(formatDuration(5)).toBe("0:05");
    expect(formatDuration(59)).toBe("0:59");
  });
  it("formats exactly one minute", () => {
    expect(formatDuration(60)).toBe("1:00");
  });
  it("formats minutes and seconds with zero-padded seconds", () => {
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(125)).toBe("2:05");
  });
  it("formats values >= 1 hour as H:MM:SS", () => {
    expect(formatDuration(3600)).toBe("1:00:00");
    expect(formatDuration(3725)).toBe("1:02:05");
  });
  it("negative values clamp to 0:00", () => {
    expect(formatDuration(-10)).toBe("0:00");
  });
});

describe("scriptStats", () => {
  it("computes an object with words, chars, seconds, duration", () => {
    const s = scriptStats("Hello world foo bar", 40);
    expect(s.words).toBe(4);
    expect(s.chars).toBe("Hello world foo bar".length);
    expect(s.seconds).toBe(estimateReadingSeconds(4, 40));
    expect(s.duration).toBe(formatDuration(s.seconds));
  });
  it("handles empty content", () => {
    const s = scriptStats("", 40);
    expect(s.words).toBe(0);
    expect(s.chars).toBe(0);
    expect(s.seconds).toBe(0);
    expect(s.duration).toBe("0:00");
  });
});
