import { describe, expect, it } from "vitest";
import {
  applyMoveDelta,
  applyResizeDelta,
  clampRect,
  defaultRect,
  MIN_SIZE,
  presetRect,
  type Rect,
  type ScreenSize,
} from "./viewportMath";

const SCREEN: ScreenSize = { w: 1920, h: 1080 };

describe("clampRect", () => {
  it("clamps rects that extend past the right edge", () => {
    const r: Rect = { x: 1800, y: 100, w: 400, h: 300 };
    const out = clampRect(r, SCREEN);
    expect(out.x + out.w).toBeLessThanOrEqual(SCREEN.w);
    expect(out.w).toBe(400);
    expect(out.x).toBe(SCREEN.w - 400);
  });

  it("clamps rects that extend past the bottom edge", () => {
    const r: Rect = { x: 100, y: 900, w: 400, h: 500 };
    const out = clampRect(r, SCREEN);
    expect(out.y + out.h).toBeLessThanOrEqual(SCREEN.h);
  });

  it("clamps negative x/y to zero", () => {
    const out = clampRect({ x: -50, y: -20, w: 500, h: 500 }, SCREEN);
    expect(out.x).toBe(0);
    expect(out.y).toBe(0);
  });

  it("enforces the minimum width and height", () => {
    const out = clampRect({ x: 100, y: 100, w: 10, h: 10 }, SCREEN);
    expect(out.w).toBe(MIN_SIZE.w);
    expect(out.h).toBe(MIN_SIZE.h);
  });

  it("never produces a rect larger than the screen", () => {
    const out = clampRect({ x: 0, y: 0, w: 5000, h: 5000 }, SCREEN);
    expect(out.w).toBe(SCREEN.w);
    expect(out.h).toBe(SCREEN.h);
  });
});

describe("presetRect", () => {
  it("full covers the entire screen", () => {
    const r = presetRect("full", SCREEN);
    expect(r).toEqual({ x: 0, y: 0, w: SCREEN.w, h: SCREEN.h });
  });

  it("tr lands flush to the top-right", () => {
    const r = presetRect("tr", SCREEN);
    expect(r.y).toBe(0);
    expect(r.x + r.w).toBe(SCREEN.w);
    expect(r.w).toBeLessThan(SCREEN.w);
    expect(r.h).toBeLessThan(SCREEN.h);
  });

  it("tl lands flush to the top-left", () => {
    const r = presetRect("tl", SCREEN);
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
  });

  it("br lands flush to the bottom-right", () => {
    const r = presetRect("br", SCREEN);
    expect(r.x + r.w).toBe(SCREEN.w);
    expect(r.y + r.h).toBe(SCREEN.h);
  });

  it("mc is centered on both axes", () => {
    const r = presetRect("mc", SCREEN);
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    expect(Math.abs(cx - SCREEN.w / 2)).toBeLessThan(2);
    expect(Math.abs(cy - SCREEN.h / 2)).toBeLessThan(2);
  });

  it("top-strip spans the full width along the top edge", () => {
    const r = presetRect("top-strip", SCREEN);
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
    expect(r.w).toBe(SCREEN.w);
    expect(r.h).toBeLessThan(SCREEN.h / 2);
  });

  it("bottom-strip spans the full width along the bottom edge", () => {
    const r = presetRect("bottom-strip", SCREEN);
    expect(r.x).toBe(0);
    expect(r.w).toBe(SCREEN.w);
    expect(r.y + r.h).toBe(SCREEN.h);
  });

  it("left spans the full height along the left edge", () => {
    const r = presetRect("left", SCREEN);
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
    expect(r.h).toBe(SCREEN.h);
  });

  it("right spans the full height along the right edge", () => {
    const r = presetRect("right", SCREEN);
    expect(r.x + r.w).toBe(SCREEN.w);
    expect(r.y).toBe(0);
    expect(r.h).toBe(SCREEN.h);
  });
});

describe("defaultRect", () => {
  it("places the panel on the right half of the screen", () => {
    const r = defaultRect(SCREEN);
    expect(r.x + r.w / 2).toBeGreaterThan(SCREEN.w / 2);
  });

  it("vertically centers the panel within a reasonable tolerance", () => {
    const r = defaultRect(SCREEN);
    const cy = r.y + r.h / 2;
    expect(Math.abs(cy - SCREEN.h / 2)).toBeLessThan(SCREEN.h * 0.1);
  });

  it("never exceeds the screen bounds", () => {
    const r = defaultRect(SCREEN);
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.y).toBeGreaterThanOrEqual(0);
    expect(r.x + r.w).toBeLessThanOrEqual(SCREEN.w);
    expect(r.y + r.h).toBeLessThanOrEqual(SCREEN.h);
  });
});

describe("applyMoveDelta", () => {
  it("shifts by dx/dy", () => {
    const r: Rect = { x: 100, y: 100, w: 400, h: 300 };
    const out = applyMoveDelta(r, 50, -20, SCREEN);
    expect(out.x).toBe(150);
    expect(out.y).toBe(80);
    expect(out.w).toBe(400);
    expect(out.h).toBe(300);
  });

  it("clamps against the left edge", () => {
    const r: Rect = { x: 10, y: 10, w: 400, h: 300 };
    const out = applyMoveDelta(r, -500, 0, SCREEN);
    expect(out.x).toBe(0);
  });

  it("clamps against the right edge", () => {
    const r: Rect = { x: 1500, y: 10, w: 400, h: 300 };
    const out = applyMoveDelta(r, 500, 0, SCREEN);
    expect(out.x + out.w).toBe(SCREEN.w);
  });
});

describe("applyResizeDelta", () => {
  it("grows the rect", () => {
    const r: Rect = { x: 100, y: 100, w: 400, h: 300 };
    const out = applyResizeDelta(r, 50, 30, SCREEN);
    expect(out.w).toBe(450);
    expect(out.h).toBe(330);
  });

  it("enforces the minimum size when shrinking", () => {
    const r: Rect = { x: 100, y: 100, w: 300, h: 200 };
    const out = applyResizeDelta(r, -500, -500, SCREEN);
    expect(out.w).toBe(MIN_SIZE.w);
    expect(out.h).toBe(MIN_SIZE.h);
  });

  it("prevents growth beyond the screen edge", () => {
    const r: Rect = { x: 1500, y: 800, w: 400, h: 200 };
    const out = applyResizeDelta(r, 2000, 2000, SCREEN);
    expect(out.x + out.w).toBeLessThanOrEqual(SCREEN.w);
    expect(out.y + out.h).toBeLessThanOrEqual(SCREEN.h);
  });
});
