# Milestone 1 — Foundation & Shared Components: Validation Contract

> Tool: `vitest` (`npm run test:frontend`)  
> Evidence: test output, `npm run typecheck` pass  
> Environment: jsdom (no browser)

---

## A. Design Token System

### VAL-FOUND-001: Color tokens are defined as CSS custom properties

All core color tokens (`--color-gp-ink`, `--color-gp-ink-2`, `--color-gp-ink-3`, `--color-gp-graphite`, `--color-gp-steel`, `--color-gp-paper`, `--color-gp-paper-dim`, `--color-gp-paper-dim-2`, `--color-gp-mute`, `--color-gp-mute-2`, `--color-gp-bronze`, `--color-gp-copper`, `--color-gp-amber`, `--color-gp-ember`, `--color-gp-mint`, `--color-gp-sunset`) are declared in the `@theme` block of `src/index.css`. A Vitest test reads the stylesheet source or a token manifest and asserts every listed token name is present.

**Pass:** all 16 color tokens are found in the theme definition.  
**Fail:** any token is missing or misspelled.

### VAL-FOUND-002: Alias tokens resolve to base tokens

`--color-gp-accent` resolves to `var(--color-gp-bronze)`, `--color-gp-live` to `var(--color-gp-amber)`. Legacy aliases `--color-gp-cerulean` → bronze, `--color-gp-violet` → copper, and the 8 `--color-ghost-*` aliases all resolve to their counterparts.

**Pass:** each alias entry in the stylesheet or token map equals the expected `var(--color-*)` reference.  
**Fail:** alias is missing, points to wrong token, or uses a hardcoded hex value.

### VAL-FOUND-003: Glass surface tokens are defined

`--gp-glass-1` through `--gp-glass-4`, `--gp-hairline`, `--gp-hairline-strong`, `--gp-highlight` are declared with `rgba()` values.

**Pass:** all 7 glass tokens are present in the theme block.  
**Fail:** any glass token is missing.

### VAL-FOUND-004: Typography tokens are defined

`--font-serif` (Fraunces stack), `--font-display` / `--font-sans` (Geist stack), `--font-mono` (Geist Mono stack), `--font-prompter` are declared.

**Pass:** all 5 font tokens exist and contain their expected primary font name.  
**Fail:** token missing or primary font name incorrect.

### VAL-FOUND-005: Shape tokens are defined

`--gp-radius-sm`, `--gp-radius` (md), `--gp-radius-lg`, `--gp-radius-xl` are declared with pixel values.

**Pass:** all 4 radius tokens exist with px values.  
**Fail:** any radius token missing.

### VAL-FOUND-006: Motion tokens are defined

`--gp-ease`, `--gp-ease-out`, `--gp-ease-swift`, `--gp-spring`, `--gp-spring-soft` are declared with `cubic-bezier()` values.

**Pass:** all 5 motion tokens exist with cubic-bezier values.  
**Fail:** any motion token missing.

### VAL-FOUND-007: Token extraction — tokens are importable as a structured manifest

A `src/ui/tokens.ts` module (or equivalent) re-exports the full set of token names as a `const` record/object, allowing components and tests to reference token names programmatically instead of duplicating magic strings.

**Pass:** importing `tokens` from `@/ui/tokens` compiles, and the exported keys include at minimum the 16 colors, 7 glass surfaces, 5 fonts, 4 radii, and 5 easings listed above.  
**Fail:** module does not exist, import fails, or key count is incomplete.

---

## B. Shared Component — BrandMark

### VAL-FOUND-008: BrandMark renders SVG icon

The extracted `<BrandMark />` component renders an `<svg>` element representing the ghost logo icon.

**Pass:** `render(<BrandMark />)` produces a DOM tree containing at least one `<svg>` element.  
**Fail:** no SVG found in output.

### VAL-FOUND-009: BrandMark is aria-hidden by default

The brand mark is decorative. The outermost wrapper carries `aria-hidden="true"`.

**Pass:** the container element has `aria-hidden="true"`.  
**Fail:** attribute missing or `"false"`.

### VAL-FOUND-010: BrandMark is exported from barrel

`import { BrandMark } from '@/ui'` resolves and the component is a valid React function component.

**Pass:** named import compiles and `typeof BrandMark === 'function'`.  
**Fail:** import fails or type mismatch.

---

## C. Shared Component — StatBlock

### VAL-FOUND-011: StatBlock renders label and value

`render(<StatBlock label="Words" value={128} />)` renders both the label text and the value text.

**Pass:** both `"Words"` and `"128"` appear in the rendered output.  
**Fail:** either is missing.

### VAL-FOUND-012: StatBlock accepts a hint prop

`render(<StatBlock label="Time" value="1:23" hint="150 wpm" />)` renders the hint string.

**Pass:** `"150 wpm"` is visible.  
**Fail:** hint not rendered.

### VAL-FOUND-013: StatBlock accepts an accent prop

When `accent` is `true`, the value element receives the `gp-stat__value--accent` class (or equivalent accent styling indicator).

**Pass:** `container.querySelector('.gp-stat__value--accent')` is not null when `accent` is true, and is null when `accent` is false/absent.  
**Fail:** class is always or never present regardless of prop.

### VAL-FOUND-014: StatBlock exposes data attributes for label and value

The label element has `data-gp-stat-label` and the value element has `data-gp-stat-value` for test targeting.

**Pass:** both `[data-gp-stat-label]` and `[data-gp-stat-value]` selectors match.  
**Fail:** either selector returns null.

### VAL-FOUND-015: StatBlock has proper TypeScript prop interface

The component accepts `{ label: string; value: string | number; hint?: string; className?: string; accent?: boolean }`. A type-level test (or `expectTypeOf`) confirms the shape.

**Pass:** `npm run typecheck` passes with correct prop usage; incorrect usage (e.g., missing `label`) produces a type error.  
**Fail:** typecheck does not enforce the required/optional distinction.

---

## D. Shared Component — RecDot

### VAL-FOUND-016: RecDot renders with active state

`render(<RecDot active />)` produces an element with class `gp-rec-dot` and without `gp-rec-dot--idle`.

**Pass:** `.gp-rec-dot` present, `.gp-rec-dot--idle` absent.  
**Fail:** wrong class combination.

### VAL-FOUND-017: RecDot renders with idle state

`render(<RecDot active={false} />)` produces an element with both `gp-rec-dot` and `gp-rec-dot--idle`.

**Pass:** both classes present.  
**Fail:** idle class missing.

### VAL-FOUND-018: RecDot has accessible label reflecting state

The element has an `aria-label` attribute whose text differs between `active` and `idle` states.

**Pass:** `aria-label` is truthy for both states and the two values are distinct strings.  
**Fail:** `aria-label` is missing or identical in both states.

### VAL-FOUND-019: RecDot pulse animation is defined in CSS

The stylesheet contains a `@keyframes` rule (e.g., `gp-rec-pulse` or `gp-chip-pulse`) that is applied to `.gp-rec-dot` (not `.gp-rec-dot--idle`). The test asserts the keyframes name is present in the CSS source.

**Pass:** keyframes rule found and referenced by the active dot class.  
**Fail:** animation missing or not wired.

---

## E. Shared Component — KbdHint

### VAL-FOUND-020: KbdHint renders key badges

`render(<KbdHint keys={["Ctrl", "S"]} label="Save" />)` renders `<kbd>` elements for each key.

**Pass:** two `<kbd>` elements are found in the DOM, containing `"Ctrl"` and `"S"`.  
**Fail:** `<kbd>` count does not match `keys.length` or text mismatches.

### VAL-FOUND-021: KbdHint renders label text

The label `"Save"` appears as a sibling `<span>` (or text) next to the `<kbd>` badges.

**Pass:** `"Save"` is visible in the rendered output.  
**Fail:** label missing.

### VAL-FOUND-022: KbdHint single-key shortcut

`render(<KbdHint keys={["F7"]} label="Play" />)` renders exactly one `<kbd>` with `"F7"`.

**Pass:** one `<kbd>` element.  
**Fail:** zero or more than one.

### VAL-FOUND-023: KbdHint has proper TypeScript prop interface

The component requires `keys: string[]` and `label: string`. TypeScript rejects calls missing either prop.

**Pass:** typecheck pass with valid props; type error on missing props.  
**Fail:** props not enforced.

---

## F. Shared Component — ToolbarButton

### VAL-FOUND-024: ToolbarButton renders children as label

`render(<ToolbarButton onClick={fn}>Save</ToolbarButton>)` produces a `<button>` whose text content is `"Save"`.

**Pass:** button text matches children.  
**Fail:** children not rendered.

### VAL-FOUND-025: ToolbarButton fires onClick

Clicking the button calls the provided `onClick` handler exactly once.

**Pass:** `onClick` mock called once after `userEvent.click` / `fireEvent.click`.  
**Fail:** handler not called or called multiple times.

### VAL-FOUND-026: ToolbarButton applies ghost style class

The rendered `<button>` carries `gp-btn gp-btn--ghost` in its class list.

**Pass:** both classes present.  
**Fail:** either missing.

### VAL-FOUND-027: ToolbarButton passes through className

`<ToolbarButton onClick={fn} className="extra">X</ToolbarButton>` renders a button with `"extra"` in its class list.

**Pass:** `.extra` selector matches.  
**Fail:** extra class dropped.

### VAL-FOUND-028: ToolbarButton has proper TypeScript prop interface

`{ children: React.ReactNode; onClick: () => void; className?: string }`. TypeScript enforces `onClick` and `children`.

**Pass:** typecheck pass.  
**Fail:** missing required props not flagged.

---

## G. Shared Component — PanelHeader

### VAL-FOUND-029: PanelHeader renders numeral, label, and meta

`render(<PanelHeader numeral="01" label="Script" meta="draft · markdown" />)` shows all three text segments.

**Pass:** `"01"`, `"Script"`, and `"draft · markdown"` all appear in the output.  
**Fail:** any segment missing.

### VAL-FOUND-030: PanelHeader numeral is aria-hidden

The numeral `<span>` carries `aria-hidden="true"` because it is decorative.

**Pass:** element containing the numeral has `aria-hidden`.  
**Fail:** attribute missing.

### VAL-FOUND-031: PanelHeader rule separator is aria-hidden

The decorative rule element between numeral and label has `aria-hidden="true"`.

**Pass:** rule element has `aria-hidden`.  
**Fail:** attribute missing.

### VAL-FOUND-032: PanelHeader has proper TypeScript prop interface

Requires `{ numeral: string; label: string; meta: string }`. All three are required strings.

**Pass:** typecheck pass; missing prop triggers type error.  
**Fail:** interface too loose.

---

## H. Shared Component — IconBtn

### VAL-FOUND-033: IconBtn renders children (icon content)

`render(<IconBtn onClick={fn} ariaLabel="Play">▶</IconBtn>)` renders a `<button>` containing `"▶"`.

**Pass:** button text includes the icon content.  
**Fail:** children not rendered.

### VAL-FOUND-034: IconBtn fires onClick

Clicking the button calls the `onClick` handler.

**Pass:** mock called once.  
**Fail:** handler not triggered.

### VAL-FOUND-035: IconBtn applies hot styling

When `hot` is `true`, the button carries the `gp-icn-hot` class.

**Pass:** `gp-icn-hot` present when `hot={true}`, absent when `hot` is false/omitted.  
**Fail:** class mismatch.

### VAL-FOUND-036: IconBtn applies compact styling

When `compact` is `true`, the button carries the `gp-icn--compact` class.

**Pass:** `gp-icn--compact` present.  
**Fail:** class missing.

### VAL-FOUND-037: IconBtn has accessible label

The button has `aria-label` set to the `ariaLabel` prop (or falls back to `title`).

**Pass:** `button.getAttribute('aria-label')` equals the supplied string.  
**Fail:** attribute missing or wrong.

### VAL-FOUND-038: IconBtn supports disabled state

When a `disabled` prop is provided, the `<button>` is functionally disabled (`button.disabled === true`) and the `onClick` handler is not called on click.

**Pass:** `button.disabled` is true, `onClick` not called.  
**Fail:** button still clickable or `disabled` attribute missing.

### VAL-FOUND-039: IconBtn passes through className

`<IconBtn onClick={fn} ariaLabel="X" className="gp-icn--danger">×</IconBtn>` carries `gp-icn--danger` in its class list.

**Pass:** class present.  
**Fail:** class dropped.

### VAL-FOUND-040: IconBtn has proper TypeScript prop interface

`{ children: React.ReactNode; onClick: () => void; title?: string; ariaLabel?: string; hot?: boolean; compact?: boolean; disabled?: boolean; className?: string }`. `children` and `onClick` required.

**Pass:** typecheck pass.  
**Fail:** interface mismatch.

---

## I. Glass Panel Surface

### VAL-FOUND-041: Glass panel CSS class applies backdrop-filter

The `.gp-glass` class in the stylesheet declares `backdrop-filter: blur(18px) saturate(118%)` (and the `-webkit-` prefixed variant).

**Pass:** CSS source contains both `backdrop-filter` and `-webkit-backdrop-filter` on `.gp-glass` with blur + saturate values.  
**Fail:** property missing or values differ.

### VAL-FOUND-042: Glass panel uses token-based background

The `.gp-glass` background value references `var(--gp-glass-2)` (not a hardcoded rgba).

**Pass:** CSS rule for `.gp-glass` includes `background: var(--gp-glass-2)`.  
**Fail:** hardcoded color used instead of token.

### VAL-FOUND-043: Glass panel uses token-based border

The `.gp-glass` border references `var(--gp-hairline)` for its border color.

**Pass:** CSS rule contains `border:` using `var(--gp-hairline)`.  
**Fail:** hardcoded border color.

### VAL-FOUND-044: Glass panel uses token-based radius

The `.gp-glass` border-radius references `var(--gp-radius-lg)`.

**Pass:** `border-radius: var(--gp-radius-lg)` found.  
**Fail:** hardcoded pixel value.

### VAL-FOUND-045: Glass strong variant uses elevated token

`.gp-glass-strong` references `var(--gp-glass-3)` and `var(--gp-hairline-strong)`.

**Pass:** both token references found in the CSS for `.gp-glass-strong`.  
**Fail:** tokens not used.

### VAL-FOUND-046: Glass whisper variant uses subdued token

`.gp-glass-whisper` references `var(--gp-glass-1)`.

**Pass:** `var(--gp-glass-1)` found for `.gp-glass-whisper`.  
**Fail:** token not referenced.

---

## J. Divider / Separator

### VAL-FOUND-047: Divider component or CSS class exists

A `<Divider />` component or a `.gp-divider` / `.gp-topbar-sep` CSS class exists for use as a visual separator in toolbars and panels.

**Pass:** component importable from `@/ui` or CSS class defined in the stylesheet.  
**Fail:** neither exists.

### VAL-FOUND-048: Divider is aria-hidden

The separator element carries `aria-hidden="true"` since it is purely decorative.

**Pass:** `aria-hidden` attribute present.  
**Fail:** missing.

---

## K. Barrel Export & Module Boundaries

### VAL-FOUND-049: Barrel file exists at src/ui/index.ts

A barrel export file `src/ui/index.ts` exists and re-exports all shared primitives: `BrandMark`, `StatBlock`, `RecDot`, `KbdHint`, `ToolbarButton`, `PanelHeader`, `IconBtn`.

**Pass:** `import { BrandMark, StatBlock, RecDot, KbdHint, ToolbarButton, PanelHeader, IconBtn } from '@/ui'` compiles.  
**Fail:** barrel file missing or any named export absent.

### VAL-FOUND-050: Each shared component lives in its own file under src/ui/

Every shared primitive is in a dedicated file (e.g., `src/ui/BrandMark.tsx`, `src/ui/KbdHint.tsx`, etc.) — not inlined inside view components.

**Pass:** `glob('src/ui/{BrandMark,StatBlock,RecDot,KbdHint,ToolbarButton,PanelHeader,IconBtn}.tsx')` returns 7 files.  
**Fail:** any file missing (component still inlined in a view).

### VAL-FOUND-051: EditorView imports shared components from @/ui

`src/editor/EditorView.tsx` imports `BrandMark`, `KbdHint`, `ToolbarButton`, `PanelHeader` from `@/ui` (or `@/ui/*`) instead of defining them inline.

**Pass:** `grep` of EditorView.tsx shows import paths starting with `@/ui`.  
**Fail:** components still defined inside EditorView.tsx as local functions.

### VAL-FOUND-052: TeleprompterView imports IconBtn from @/ui

`src/teleprompter/TeleprompterView.tsx` imports `IconBtn` from `@/ui` (or `@/ui/IconBtn`) instead of defining it inline.

**Pass:** import path references `@/ui`.  
**Fail:** `IconBtn` still defined locally inside TeleprompterView.tsx.

---

## L. Legacy Cleanup

### VAL-FOUND-053: Frame component is deprecated or removed

`src/ui/Frame.tsx` is either (a) deleted, or (b) annotated as `@deprecated` in its JSDoc and not imported by any non-test file in `src/editor/` or `src/teleprompter/`.

**Pass:** no active import of `Frame` in EditorView.tsx or TeleprompterView.tsx. If the file still exists, its JSDoc includes `@deprecated`.  
**Fail:** Frame is imported and used in active UI code without deprecation notice.

### VAL-FOUND-054: ChannelLabel component is deprecated or removed

`src/ui/ChannelLabel.tsx` is either (a) deleted, or (b) annotated as `@deprecated` in its JSDoc and not imported by any non-test file in `src/editor/` or `src/teleprompter/`.

**Pass:** no active import of `ChannelLabel` in view files. If file exists, JSDoc includes `@deprecated`.  
**Fail:** ChannelLabel used in active UI without deprecation.

### VAL-FOUND-055: Legacy components excluded from barrel exports

`Frame` and `ChannelLabel` are NOT re-exported from `src/ui/index.ts`. Consumers who still need them must use direct file imports.

**Pass:** `import { Frame } from '@/ui'` and `import { ChannelLabel } from '@/ui'` both produce TypeScript errors (names not exported).  
**Fail:** either name is publicly exported from the barrel.

---

## M. Accessibility

### VAL-FOUND-056: All interactive components render semantic button elements

`ToolbarButton`, `IconBtn` render `<button>` elements (not `<div>` or `<span>` with click handlers).

**Pass:** `container.querySelector('button')` is not null for each.  
**Fail:** non-button element used.

### VAL-FOUND-057: All interactive components have accessible names

Every button produced by `ToolbarButton` (via `children` text) and `IconBtn` (via `ariaLabel` or `title`) has a non-empty accessible name computable by assistive technology.

**Pass:** `getByRole('button', { name: /.../ })` succeeds for each.  
**Fail:** button has no accessible name.

### VAL-FOUND-058: Decorative elements carry aria-hidden

All decorative spans (rule separators, brand mark container, numeral in PanelHeader, RecDot visual dot, divider) carry `aria-hidden="true"`.

**Pass:** every decorative element queried in tests has `aria-hidden`.  
**Fail:** any decorative element exposed to the a11y tree.

---

## N. Token Consistency (No Hardcoded Values)

### VAL-FOUND-059: Shared components reference CSS custom properties, not hardcoded colors

Inline `style` objects and CSS classes used by `BrandMark`, `StatBlock`, `RecDot`, `KbdHint`, `ToolbarButton`, `PanelHeader`, `IconBtn` reference `var(--color-gp-*)` / `var(--gp-*)` tokens rather than raw hex or rgba values for colors, backgrounds, and borders.

**Pass:** source scan of each component file finds zero hardcoded `#rrggbb` or `rgba(` values used for theming properties (stroke/fill values inside decorative SVG markup are exempt).  
**Fail:** any component hardcodes a theme color.

### VAL-FOUND-060: Glass surface classes reference token variables

CSS rules for `.gp-glass`, `.gp-glass-strong`, `.gp-glass-whisper` reference only `var(--gp-glass-*)` and `var(--gp-hairline*)` for their background and border — no hardcoded alpha colors.

**Pass:** all background/border values use `var()` references.  
**Fail:** any hardcoded value found.

---

## O. TypeScript Compliance

### VAL-FOUND-061: All shared components pass typecheck

`npm run typecheck` succeeds with zero errors across all files in `src/ui/`.

**Pass:** exit code 0, no errors referencing `src/ui/` files.  
**Fail:** any type error in shared component code.

### VAL-FOUND-062: Prop interfaces are exported alongside components

Each shared component's prop type (e.g., `StatBlockProps`, `IconBtnProps`) is exported so consumers and tests can reference it for type-level assertions.

**Pass:** importing `{ StatBlockProps }` (or equivalent) from the component file compiles.  
**Fail:** prop type not exported.

---

## P. Test Completeness

### VAL-FOUND-063: Every shared component has a colocated test file

For each `src/ui/{Component}.tsx` there exists `src/ui/{Component}.test.tsx`.

**Pass:** glob `src/ui/*.test.tsx` returns at least one test file per shared component (7 minimum: BrandMark, StatBlock, RecDot, KbdHint, ToolbarButton, PanelHeader, IconBtn).  
**Fail:** any component missing its test file.

### VAL-FOUND-064: All foundation tests pass

`npm run test:frontend` exits with code 0 and reports no failures for test files in `src/ui/`.

**Pass:** zero test failures.  
**Fail:** any failure.
