import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { currentMonitorMock } = vi.hoisted(() => ({
  currentMonitorMock: vi.fn(),
}));

vi.mock("@tauri-apps/api/window", () => ({
  currentMonitor: currentMonitorMock,
}));

import { getDisplayBounds, getFallbackDisplayBounds } from "./displayBounds";

const originalAvailWidth = window.screen.availWidth;
const originalAvailHeight = window.screen.availHeight;

beforeEach(() => {
  currentMonitorMock.mockReset();
});

afterEach(() => {
  Object.defineProperty(window.screen, "availWidth", {
    configurable: true,
    value: originalAvailWidth,
  });
  Object.defineProperty(window.screen, "availHeight", {
    configurable: true,
    value: originalAvailHeight,
  });
});

describe("getFallbackDisplayBounds", () => {
  it("prefers screen available size when present", () => {
    Object.defineProperty(window.screen, "availWidth", {
      configurable: true,
      value: 1920,
    });
    Object.defineProperty(window.screen, "availHeight", {
      configurable: true,
      value: 1080,
    });

    expect(getFallbackDisplayBounds()).toEqual({
      x: 0,
      y: 0,
      w: 1920,
      h: 1080,
    });
  });

  it("falls back to inner window size when screen values are unavailable", () => {
    Object.defineProperty(window.screen, "availWidth", {
      configurable: true,
      value: 0,
    });
    Object.defineProperty(window.screen, "availHeight", {
      configurable: true,
      value: 0,
    });

    expect(getFallbackDisplayBounds()).toEqual({
      x: 0,
      y: 0,
      w: window.innerWidth,
      h: window.innerHeight,
    });
  });
});

describe("getDisplayBounds", () => {
  it("uses current monitor work area including desktop origin", async () => {
    currentMonitorMock.mockResolvedValueOnce({
      scaleFactor: 1,
      workArea: {
        position: { x: -1920, y: 40 },
        size: { width: 1720, height: 1000 },
      },
    });

    await expect(getDisplayBounds()).resolves.toEqual({
      x: -1920,
      y: 40,
      w: 1720,
      h: 1000,
    });
  });

  it("converts physical monitor work area bounds to logical pixels", async () => {
    currentMonitorMock.mockResolvedValueOnce({
      scaleFactor: 1.5,
      workArea: {
        position: { x: -2880, y: 60 },
        size: { width: 2580, height: 1500 },
      },
    });

    await expect(getDisplayBounds()).resolves.toEqual({
      x: -1920,
      y: 40,
      w: 1720,
      h: 1000,
    });
  });

  it("falls back when currentMonitor is unavailable", async () => {
    currentMonitorMock.mockResolvedValueOnce(null);
    Object.defineProperty(window.screen, "availWidth", {
      configurable: true,
      value: 1600,
    });
    Object.defineProperty(window.screen, "availHeight", {
      configurable: true,
      value: 900,
    });

    await expect(getDisplayBounds()).resolves.toEqual({
      x: 0,
      y: 0,
      w: 1600,
      h: 900,
    });
  });
});
