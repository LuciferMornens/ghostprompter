/**
 * Design-token manifest — the single source of truth for every CSS custom
 * property declared in the `@theme` block of `src/index.css`.
 *
 * Components and tests import from here instead of sprinkling magic strings.
 * The object mirrors the `@theme` variable names so a simple
 * `var(tokens.colors.ink)` produces `var(--color-gp-ink)`.
 */

/** Map a flat list of keys to their CSS `var()` references. */
type TokenRecord<K extends string> = Readonly<Record<K, `var(--${string})`>>;

/* -----------------------------------------------------------------------
   Colors (16 core palette tokens)
   ----------------------------------------------------------------------- */

const colorKeys = [
  "ink",
  "ink2",
  "ink3",
  "graphite",
  "steel",
  "paper",
  "paperDim",
  "paperDim2",
  "mute",
  "mute2",
  "bronze",
  "copper",
  "amber",
  "ember",
  "mint",
  "sunset",
] as const;

type ColorKey = (typeof colorKeys)[number];

const colors: TokenRecord<ColorKey> = {
  ink: "var(--color-gp-ink)",
  ink2: "var(--color-gp-ink-2)",
  ink3: "var(--color-gp-ink-3)",
  graphite: "var(--color-gp-graphite)",
  steel: "var(--color-gp-steel)",
  paper: "var(--color-gp-paper)",
  paperDim: "var(--color-gp-paper-dim)",
  paperDim2: "var(--color-gp-paper-dim-2)",
  mute: "var(--color-gp-mute)",
  mute2: "var(--color-gp-mute-2)",
  bronze: "var(--color-gp-bronze)",
  copper: "var(--color-gp-copper)",
  amber: "var(--color-gp-amber)",
  ember: "var(--color-gp-ember)",
  mint: "var(--color-gp-mint)",
  sunset: "var(--color-gp-sunset)",
} as const;

/* -----------------------------------------------------------------------
   Glass surfaces (7 tokens)
   ----------------------------------------------------------------------- */

const glassKeys = [
  "glass1",
  "glass2",
  "glass3",
  "glass4",
  "hairline",
  "hairlineStrong",
  "highlight",
] as const;

type GlassKey = (typeof glassKeys)[number];

const glass: TokenRecord<GlassKey> = {
  glass1: "var(--gp-glass-1)",
  glass2: "var(--gp-glass-2)",
  glass3: "var(--gp-glass-3)",
  glass4: "var(--gp-glass-4)",
  hairline: "var(--gp-hairline)",
  hairlineStrong: "var(--gp-hairline-strong)",
  highlight: "var(--gp-highlight)",
} as const;

/* -----------------------------------------------------------------------
   Fonts (5 stacks)
   ----------------------------------------------------------------------- */

const fontKeys = [
  "serif",
  "display",
  "sans",
  "mono",
  "prompter",
] as const;

type FontKey = (typeof fontKeys)[number];

const fonts: TokenRecord<FontKey> = {
  serif: "var(--font-serif)",
  display: "var(--font-display)",
  sans: "var(--font-sans)",
  mono: "var(--font-mono)",
  prompter: "var(--font-prompter)",
} as const;

/* -----------------------------------------------------------------------
   Radii (4 sizes)
   ----------------------------------------------------------------------- */

const radiusKeys = [
  "sm",
  "default",
  "lg",
  "xl",
] as const;

type RadiusKey = (typeof radiusKeys)[number];

const radii: TokenRecord<RadiusKey> = {
  sm: "var(--gp-radius-sm)",
  default: "var(--gp-radius)",
  lg: "var(--gp-radius-lg)",
  xl: "var(--gp-radius-xl)",
} as const;

/* -----------------------------------------------------------------------
   Easings (5 curves)
   ----------------------------------------------------------------------- */

const easingKeys = [
  "ease",
  "easeOut",
  "easeSwift",
  "spring",
  "springSoft",
] as const;

type EasingKey = (typeof easingKeys)[number];

const easings: TokenRecord<EasingKey> = {
  ease: "var(--gp-ease)",
  easeOut: "var(--gp-ease-out)",
  easeSwift: "var(--gp-ease-swift)",
  spring: "var(--gp-spring)",
  springSoft: "var(--gp-spring-soft)",
} as const;

/* -----------------------------------------------------------------------
   Aggregate export
   ----------------------------------------------------------------------- */

export const tokens = {
  colors,
  glass,
  fonts,
  radii,
  easings,
} as const;

export type { ColorKey, GlassKey, FontKey, RadiusKey, EasingKey };
export { colorKeys, glassKeys, fontKeys, radiusKeys, easingKeys };
