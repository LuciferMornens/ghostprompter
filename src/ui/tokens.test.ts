import { describe, it, expect } from "vitest";
import {
  tokens,
  colorKeys,
  glassKeys,
  fontKeys,
  radiusKeys,
  easingKeys,
} from "./tokens";

describe("Design token manifest", () => {
  /* ------------------------------------------------------------------
   * Category completeness
   * ------------------------------------------------------------------ */

  it("defines exactly 18 color tokens", () => {
    expect(Object.keys(tokens.colors)).toHaveLength(18);
    expect(colorKeys).toHaveLength(18);
  });

  it("defines exactly 14 glass surface tokens", () => {
    expect(Object.keys(tokens.glass)).toHaveLength(14);
    expect(glassKeys).toHaveLength(14);
  });

  it("defines exactly 5 font tokens", () => {
    expect(Object.keys(tokens.fonts)).toHaveLength(5);
    expect(fontKeys).toHaveLength(5);
  });

  it("defines exactly 4 radius tokens", () => {
    expect(Object.keys(tokens.radii)).toHaveLength(4);
    expect(radiusKeys).toHaveLength(4);
  });

  it("defines exactly 5 easing tokens", () => {
    expect(Object.keys(tokens.easings)).toHaveLength(5);
    expect(easingKeys).toHaveLength(5);
  });

  /* ------------------------------------------------------------------
   * Every value is a valid CSS var() reference
   * ------------------------------------------------------------------ */

  const allEntries = [
    ...Object.entries(tokens.colors),
    ...Object.entries(tokens.glass),
    ...Object.entries(tokens.fonts),
    ...Object.entries(tokens.radii),
    ...Object.entries(tokens.easings),
  ];

  it.each(allEntries)(
    "%s maps to a var(--*) reference",
    (_key, value) => {
      expect(value).toMatch(/^var\(--[\w-]+\)$/);
    },
  );

  /* ------------------------------------------------------------------
   * Key arrays match object keys (guard against drift)
   * ------------------------------------------------------------------ */

  it("colorKeys matches tokens.colors keys", () => {
    expect([...colorKeys]).toEqual(Object.keys(tokens.colors));
  });

  it("glassKeys matches tokens.glass keys", () => {
    expect([...glassKeys]).toEqual(Object.keys(tokens.glass));
  });

  it("fontKeys matches tokens.fonts keys", () => {
    expect([...fontKeys]).toEqual(Object.keys(tokens.fonts));
  });

  it("radiusKeys matches tokens.radii keys", () => {
    expect([...radiusKeys]).toEqual(Object.keys(tokens.radii));
  });

  it("easingKeys matches tokens.easings keys", () => {
    expect([...easingKeys]).toEqual(Object.keys(tokens.easings));
  });

  /* ------------------------------------------------------------------
   * Spot-check critical tokens to prevent silent renames
   * ------------------------------------------------------------------ */

  it("colors.ink references --color-gp-ink", () => {
    expect(tokens.colors.ink).toBe("var(--color-gp-ink)");
  });

  it("colors.bronze references --color-gp-bronze", () => {
    expect(tokens.colors.bronze).toBe("var(--color-gp-bronze)");
  });

  it("glass.hairline references --gp-hairline", () => {
    expect(tokens.glass.hairline).toBe("var(--gp-hairline)");
  });

  it("fonts.serif references --font-serif", () => {
    expect(tokens.fonts.serif).toBe("var(--font-serif)");
  });

  it("fonts.display references --font-display", () => {
    expect(tokens.fonts.display).toBe("var(--font-display)");
  });

  it("radii.default references --gp-radius", () => {
    expect(tokens.radii.default).toBe("var(--gp-radius)");
  });

  it("easings.spring references --gp-spring", () => {
    expect(tokens.easings.spring).toBe("var(--gp-spring)");
  });

  /* ------------------------------------------------------------------
   * Total token count across all categories
   * ------------------------------------------------------------------ */

  it("manifest covers 46 tokens total (18+14+5+4+5)", () => {
    const total =
      Object.keys(tokens.colors).length +
      Object.keys(tokens.glass).length +
      Object.keys(tokens.fonts).length +
      Object.keys(tokens.radii).length +
      Object.keys(tokens.easings).length;
    expect(total).toBe(46);
  });
});
