// =========================================================================
// Viewport math — pure helpers for the movable/resizable reading rectangle.
// No DOM, no React, trivially unit-tested. Coordinates are in CSS pixels
// relative to the fullscreen transparent teleprompter window.
// =========================================================================

export type Rect = { x: number; y: number; w: number; h: number };
export type ScreenSize = { x?: number; y?: number; w: number; h: number };

export type Preset =
  | "tl"
  | "tc"
  | "tr"
  | "ml"
  | "mc"
  | "mr"
  | "bl"
  | "bc"
  | "br"
  | "top-strip"
  | "bottom-strip"
  | "left"
  | "right"
  | "full";

export const MIN_SIZE: ScreenSize = { w: 260, h: 160 };

/**
 * Clamp a rect so it stays on screen and respects the minimum size.
 * - Size is clamped to [min, screen]
 * - Position is clamped so the rect never leaves the screen
 */
export function clampRect(
  r: Rect,
  screen: ScreenSize,
  min: ScreenSize = MIN_SIZE,
): Rect {
  const sx = screen.x ?? 0;
  const sy = screen.y ?? 0;
  const w = Math.max(min.w, Math.min(screen.w, Math.round(r.w)));
  const h = Math.max(min.h, Math.min(screen.h, Math.round(r.h)));
  const maxX = Math.max(sx, sx + screen.w - w);
  const maxY = Math.max(sy, sy + screen.h - h);
  const x = Math.max(sx, Math.min(maxX, Math.round(r.x)));
  const y = Math.max(sy, Math.min(maxY, Math.round(r.y)));
  return { x, y, w, h };
}

/**
 * Compute a preset rectangle for the given screen. Corner/edge cells occupy
 * a fraction of the screen and sit flush against the chosen side.
 */
export function presetRect(p: Preset, screen: ScreenSize): Rect {
  const sx = screen.x ?? 0;
  const sy = screen.y ?? 0;
  const sw = screen.w;
  const sh = screen.h;

  // Corner size — a comfortable 35% × 45%
  const cw = Math.round(sw * 0.35);
  const ch = Math.round(sh * 0.45);

  // Edge cell sizes
  const edgeHW = Math.round(sw * 0.5); // horizontal edge cell width
  const edgeHH = Math.round(sh * 0.35); // horizontal edge cell height
  const edgeVW = Math.round(sw * 0.35); // vertical edge cell width
  const edgeVH = Math.round(sh * 0.5); // vertical edge cell height

  // Center
  const mcW = Math.round(sw * 0.55);
  const mcH = Math.round(sh * 0.55);

  // Strips
  const stripH = Math.round(sh * 0.22);
  const edgeColW = Math.round(sw * 0.32);

  switch (p) {
    case "tl":
      return clampRect({ x: sx, y: sy, w: cw, h: ch }, screen);
    case "tr":
      return clampRect({ x: sx + sw - cw, y: sy, w: cw, h: ch }, screen);
    case "bl":
      return clampRect({ x: sx, y: sy + sh - ch, w: cw, h: ch }, screen);
    case "br":
      return clampRect(
        { x: sx + sw - cw, y: sy + sh - ch, w: cw, h: ch },
        screen,
      );

    case "tc":
      return clampRect(
        {
          x: sx + Math.round((sw - edgeHW) / 2),
          y: sy,
          w: edgeHW,
          h: edgeHH,
        },
        screen,
      );
    case "bc":
      return clampRect(
        {
          x: sx + Math.round((sw - edgeHW) / 2),
          y: sy + sh - edgeHH,
          w: edgeHW,
          h: edgeHH,
        },
        screen,
      );

    case "ml":
      return clampRect(
        {
          x: sx,
          y: sy + Math.round((sh - edgeVH) / 2),
          w: edgeVW,
          h: edgeVH,
        },
        screen,
      );
    case "mr":
      return clampRect(
        {
          x: sx + sw - edgeVW,
          y: sy + Math.round((sh - edgeVH) / 2),
          w: edgeVW,
          h: edgeVH,
        },
        screen,
      );

    case "mc":
      return clampRect(
        {
          x: sx + Math.round((sw - mcW) / 2),
          y: sy + Math.round((sh - mcH) / 2),
          w: mcW,
          h: mcH,
        },
        screen,
      );

    case "top-strip":
      return clampRect({ x: sx, y: sy, w: sw, h: stripH }, screen);
    case "bottom-strip":
      return clampRect({ x: sx, y: sy + sh - stripH, w: sw, h: stripH }, screen);

    case "left":
      return clampRect({ x: sx, y: sy, w: edgeColW, h: sh }, screen);
    case "right":
      return clampRect({ x: sx + sw - edgeColW, y: sy, w: edgeColW, h: sh }, screen);

    case "full":
    default:
      return clampRect({ x: sx, y: sy, w: sw, h: sh }, screen);
  }
}

/**
 * First-run default rectangle: right edge, vertically centered, roughly
 * 42% × 62% of the screen, capped so it doesn't go silly on huge displays.
 */
export function defaultRect(screen: ScreenSize): Rect {
  const sx = screen.x ?? 0;
  const sy = screen.y ?? 0;
  const w = Math.min(720, Math.round(screen.w * 0.42));
  const h = Math.min(520, Math.round(screen.h * 0.62));
  const margin = 40;
  const x = Math.max(sx, sx + screen.w - w - margin);
  const y = Math.max(sy, sy + Math.round((screen.h - h) / 2));
  return clampRect({ x, y, w, h }, screen);
}

/**
 * Apply a position delta (drag) to a rect, keeping it on-screen.
 */
export function applyMoveDelta(
  r: Rect,
  dx: number,
  dy: number,
  screen: ScreenSize,
): Rect {
  return clampRect({ x: r.x + dx, y: r.y + dy, w: r.w, h: r.h }, screen);
}

/**
 * Apply a size delta (bottom-right resize handle) to a rect, keeping it
 * on-screen and above the minimum size.
 */
export function applyResizeDelta(
  r: Rect,
  dw: number,
  dh: number,
  screen: ScreenSize,
): Rect {
  return clampRect({ x: r.x, y: r.y, w: r.w + dw, h: r.h + dh }, screen);
}
