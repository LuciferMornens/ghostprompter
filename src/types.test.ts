import { describe, it, expect } from "vitest";
import {
  DEFAULT_HOTKEYS,
  DEFAULT_SETTINGS,
  type Hotkeys,
  type Settings,
} from "@/types";

describe("DEFAULT_HOTKEYS", () => {
  it("has all 10 keys with string values", () => {
    const expectedKeys: (keyof Hotkeys)[] = [
      "playPause",
      "slower",
      "faster",
      "hideShow",
      "toggleEditMode",
      "lineUp",
      "lineDown",
      "jumpStart",
      "jumpEnd",
      "stop",
    ];
    const keys = Object.keys(DEFAULT_HOTKEYS);
    expect(keys).toHaveLength(10);
    for (const k of expectedKeys) {
      expect(DEFAULT_HOTKEYS).toHaveProperty(k);
      expect(typeof DEFAULT_HOTKEYS[k]).toBe("string");
      expect(DEFAULT_HOTKEYS[k].length).toBeGreaterThan(0);
    }
  });

  it("has the expected default bindings", () => {
    expect(DEFAULT_HOTKEYS).toEqual({
      playPause: "F7",
      slower: "F8",
      faster: "F9",
      hideShow: "F10",
      toggleEditMode: "F6",
      lineUp: "Shift+Up",
      lineDown: "Shift+Down",
      jumpStart: "Control+Home",
      jumpEnd: "Control+End",
      stop: "Escape",
    });
  });
});

describe("DEFAULT_SETTINGS", () => {
  it("matches expected default values", () => {
    const expected: Settings = {
      fontSize: 42,
      lineHeight: 1.6,
      fontFamily: "Inter",
      textColor: "#ffffff",
      bgColor: "#000000",
      bgOpacity: 0.75,
      mirrorHorizontal: false,
      mirrorVertical: false,
      scrollSpeed: 40,
      readingLineOffset: 0.4,
      highlightReadingLine: true,
      overlayWidth: 720,
      overlayHeight: 480,
      overlayX: null,
      overlayY: null,
      hotkeys: DEFAULT_HOTKEYS,
    };
    expect(DEFAULT_SETTINGS).toEqual(expected);
  });

  it("DEFAULT_SETTINGS.hotkeys references DEFAULT_HOTKEYS", () => {
    expect(DEFAULT_SETTINGS.hotkeys).toBe(DEFAULT_HOTKEYS);
  });

  it("has the expected primitive defaults individually", () => {
    expect(DEFAULT_SETTINGS.fontSize).toBe(42);
    expect(DEFAULT_SETTINGS.lineHeight).toBe(1.6);
    expect(DEFAULT_SETTINGS.scrollSpeed).toBe(40);
    expect(DEFAULT_SETTINGS.readingLineOffset).toBe(0.4);
    expect(DEFAULT_SETTINGS.bgOpacity).toBe(0.75);
    expect(DEFAULT_SETTINGS.overlayWidth).toBe(720);
    expect(DEFAULT_SETTINGS.overlayHeight).toBe(480);
    expect(DEFAULT_SETTINGS.overlayX).toBeNull();
    expect(DEFAULT_SETTINGS.overlayY).toBeNull();
    expect(DEFAULT_SETTINGS.mirrorHorizontal).toBe(false);
    expect(DEFAULT_SETTINGS.mirrorVertical).toBe(false);
    expect(DEFAULT_SETTINGS.highlightReadingLine).toBe(true);
    expect(DEFAULT_SETTINGS.fontFamily).toBe("Inter");
    expect(DEFAULT_SETTINGS.textColor).toBe("#ffffff");
    expect(DEFAULT_SETTINGS.bgColor).toBe("#000000");
  });
});
