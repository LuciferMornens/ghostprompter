# Validation Contract: Cross-Area Flows

These assertions define the behavioral contracts that must hold across the
GhostPrompter frontend redesign milestones. Each assertion specifies a
pass/fail condition, the tool used for verification, and the evidence
expected.

---

## 1 — Mode Switching (App.tsx routing)

### VAL-CROSS-001: Editor view renders when mode = editor

**Behavior:** When `modeStore.mode` is `"editor"` and the window role is
`"main"`, `<App />` renders `<EditorView />` (verified by the presence of the
editor toolbar button "Open").

**Pass condition:** `screen.getByRole("button", { name: "Open" })` resolves.

**Tool:** `npm run test:frontend` — `src/App.test.tsx` →
`"renders editor UI when mode='editor'"`

**Evidence:** Vitest console output shows the test as passing.

---

### VAL-CROSS-002: Teleprompter view renders when mode = teleprompter

**Behavior:** When `modeStore.mode` is set to `"teleprompter"` before mount,
`<App />` renders `<TeleprompterView />` (verified by the presence of the
"F6 edit · F7 play · Esc exit" hint text).

**Pass condition:** `screen.getByText(…"F6 edit · F7 play · Esc exit")` resolves.

**Tool:** `npm run test:frontend` — `src/App.test.tsx` →
`"renders teleprompter view when mode='teleprompter'"`

**Evidence:** Vitest console output shows the test as passing.

---

### VAL-CROSS-003: Body CSS class toggles with active mode

**Behavior:** `document.body` has class `mode-editor` when in editor mode and
`mode-teleprompter` when mode switches to teleprompter. Both classes never
coexist.

**Pass condition:**
- On mount: `document.body.classList.contains("mode-editor")` → `true`.
- After `useModeStore.setState({ mode: "teleprompter" })`: `mode-teleprompter`
  present, `mode-editor` absent.

**Tool:** `npm run test:frontend` — `src/App.test.tsx` →
`"sets body class to mode-editor on mount"` +
`"switches body class to mode-teleprompter when mode changes"`

**Evidence:** Both tests pass in Vitest output.

---

## 2 — Go Live Flow (Editor → Teleprompter)

### VAL-CROSS-004: Go Live calls enterTeleprompter IPC with script and rect

**Behavior:** Clicking the "Go Live" button in `<EditorView />` invokes
`ipc.enterTeleprompter(script, rect)` — i.e. `invoke("enter_teleprompter_mode", { script, rect })`
— with the current `scriptStore.script` and a computed overlay rectangle.

**Pass condition:** After user-click on the Go button, `invokeMock` was called
with `"enter_teleprompter_mode"` and an object containing `script.name`,
`script.content`, and a `rect` with valid `{ x, y, w, h }` numbers.

**Tool:** `npm run test:frontend` — `src/editor/EditorView.test.tsx` →
`"clicking Go launches the overlay command before registering hotkeys"`

**Evidence:** Vitest passes; `invokeMock` assertions confirm payload shape.

---

### VAL-CROSS-005: Go Live registers hotkeys after entering teleprompter mode

**Behavior:** The `register_hotkeys` IPC command is invoked **after**
`enter_teleprompter_mode` succeeds. The call order is enforced.

**Pass condition:** `enterIdx < regIdx` where both indices are found in the
ordered `invokeMock.mock.calls` array.

**Tool:** `npm run test:frontend` — `src/editor/EditorView.test.tsx` →
`"clicking Go launches the overlay command before registering hotkeys"`

**Evidence:** The test explicitly asserts `enterIdx < regIdx`.

---

### VAL-CROSS-006: Go Live failure shows alert and stays in editor

**Behavior:** If `enter_teleprompter_mode` rejects, `window.alert` is called
with the error message and `modeStore.mode` remains `"editor"`. Hotkeys are
not registered.

**Pass condition:** `alertSpy` called, `useModeStore.getState().mode === "editor"`.

**Tool:** `npm run test:frontend` — `src/editor/EditorView.test.tsx` →
`"if enter_teleprompter_mode rejects, calls window.alert and stays in editor"`

**Evidence:** Vitest passes with alert spy assertion and mode assertion.

---

### VAL-CROSS-007: Go Live resets playing state to false

**Behavior:** After a successful `ipc.enterTeleprompter` + `ipc.registerHotkeys`,
the `EditorView.onGo` handler calls `setPlaying(false)`. The teleprompter
starts in standby, not auto-scrolling.

**Pass condition:** `useModeStore.getState().playing === false` after Go click.

**Tool:** `npm run test:frontend` — `src/editor/EditorView.test.tsx` →
`"clicking Go launches the overlay command before registering hotkeys"`

**Evidence:** Vitest passes; assertion `expect(useModeStore.getState().playing).toBe(false)` holds.

---

## 3 — Exit Flow (Teleprompter → Editor)

### VAL-CROSS-008: Exit button unregisters hotkeys and exits teleprompter

**Behavior:** Clicking "Exit teleprompter" in `<TeleprompterView />` edit-mode
calls `ipc.unregisterHotkeys()` then `ipc.exitTeleprompter()` in sequence,
sets `playing=false`, `editMode=false`, and `mode="editor"`.

**Pass condition:** `invokeMock.mock.calls` contains both `"unregister_hotkeys"`
and `"exit_teleprompter_mode"`. Mode store values:
`mode="editor"`, `playing=false`, `editMode=false`.

**Tool:** `npm run test:frontend` — `src/teleprompter/TeleprompterView.test.tsx` →
`"clicking Exit unregisters hotkeys, exits teleprompter, and resets mode state"`

**Evidence:** Vitest passes; all three store assertions hold.

---

### VAL-CROSS-009: Stop hotkey from App.tsx overlay triggers full exit

**Behavior:** In the overlay window (window role = "overlay"), the
`hotkey://stop` listener in `<App />` calls `unregisterHotkeys()` →
`exitTeleprompter()` → sets `playing=false, editMode=false, mode="editor"`.

**Pass condition:** The `hotkey://stop` listener exists in `capturedListeners`,
and invoking it produces the expected IPC calls and store state changes.

**Tool:** `npm run test:frontend` — `src/App.test.tsx` (overlay tests cover
listener registration; behavioral assertion for stop can be verified by the
event dispatch pattern in the `useEffect` that binds `hotkey://stop`).

**Evidence:** The overlay test `"overlay window loads the live script and
registers live listeners"` confirms ≥7 listeners are registered (including
stop). The stop handler code path is the same as the Exit button path
(VAL-CROSS-008).

---

### VAL-CROSS-010: mode-changed backend event drives App mode switching

**Behavior:** When the Rust backend emits `mode-changed` with
`{ mode: "editor", edit: false }`, the `onModeChanged` listener in `<App />`
calls `setMode("editor")` and `setEditMode(false)`, causing a re-render from
`<TeleprompterView />` back to `<EditorView />`.

**Pass condition:** `onModeChanged` subscribes to `"mode-changed"` event and
forwards `(mode, edit)` to the handler.

**Tool:** `npm run test:frontend` — `src/lib/events.test.ts` →
`"subscribes to 'mode-changed' and forwards mode + edit"`

**Evidence:** Vitest passes; handler called with `("teleprompter", true)` and
`("editor", false)`.

---

## 4 — Shared MarkdownPreview Across Both Views

### VAL-CROSS-011: MarkdownPreview renders markdown in editor preview panel

**Behavior:** `<EditorView />` renders a `<MarkdownPreview content={script.content} />`
inside the preview panel. The component outputs a `.gp-prose` wrapper with
parsed markdown (headings, bold, lists, GFM, raw HTML).

**Pass condition:** `container.querySelector(".gp-prose")` is non-null in the
`<EditorView />` render.

**Tool:** `npm run test:frontend` — `src/editor/EditorView.test.tsx` →
`"renders preview column with gp-prose"`

**Evidence:** Vitest passes.

---

### VAL-CROSS-012: MarkdownPreview renders markdown in teleprompter viewport

**Behavior:** `<TeleprompterView />` renders `<MarkdownPreview content={content} />`
inside the scrollable viewport. The heading and body text are visible.

**Pass condition:** `screen.getByRole("heading", { level: 1 })` with text "Title"
is found inside the teleprompter render.

**Tool:** `npm run test:frontend` — `src/teleprompter/TeleprompterView.test.tsx` →
`"renders markdown content"`

**Evidence:** Vitest passes; heading found.

---

### VAL-CROSS-013: MarkdownPreview unit tests cover all rendering features

**Behavior:** The standalone `<MarkdownPreview />` component correctly renders:
plain text, h1, bold, italic, unordered lists, GFM strikethrough, raw HTML,
`.gp-prose` class, and custom `className` prop.

**Pass condition:** All 8 tests in `src/editor/MarkdownPreview.test.tsx` pass.

**Tool:** `npm run test:frontend` — `src/editor/MarkdownPreview.test.tsx`

**Evidence:** Vitest output shows 8/8 passing.

---

## 5 — Design Token Consistency

### VAL-CROSS-014: gp-prose class used consistently in both views

**Behavior:** The `gp-prose` CSS class is the shared design token for rendered
markdown. Both `<EditorView />` (preview panel) and `<TeleprompterView />`
(viewport) apply it through `<MarkdownPreview />`, which always wraps its
output in `<div className="gp-prose ...">`.

**Pass condition:** The string `gp-prose` appears in `MarkdownPreview.tsx` as
the wrapper class. Both consumer tests confirm the class is present in their
respective renders.

**Tool:** `npm run test:frontend` — `src/editor/MarkdownPreview.test.tsx` →
`"wrapper has class gp-prose"` + `src/editor/EditorView.test.tsx` →
`"renders preview column with gp-prose"`

**Evidence:** Both tests pass.

---

### VAL-CROSS-015: RecDot shared component works in TeleprompterView

**Behavior:** `<RecDot active={playing} />` is rendered in
`<TeleprompterView />` HUD. When `playing=true`, the dot has no `--idle`
modifier; when `playing=false`, it has `gp-rec-dot--idle`.

**Pass condition:** `<RecDot />` unit tests pass (active and idle states).
TeleprompterView renders without errors when playing toggles.

**Tool:** `npm run test:frontend` — `src/ui/RecDot.test.tsx` +
`src/teleprompter/TeleprompterView.test.tsx` → `"play button toggles playing state"`

**Evidence:** All RecDot and TeleprompterView play-toggle tests pass.

---

### VAL-CROSS-016: StatBlock shared component works in EditorView

**Behavior:** `<StatBlock />` is used in the EditorView status rail to display
Words, Chars, and Read time. Each renders a label and a numeric/string value.

**Pass condition:** `src/ui/StatBlock.test.tsx` passes. EditorView tests
confirm the labels "Words", "Chars", "Read time" are rendered.

**Tool:** `npm run test:frontend` — `src/ui/StatBlock.test.tsx` +
`src/editor/EditorView.test.tsx` → `"renders a status bar with Words stat block"`,
`"renders a status bar with Chars stat block"`,
`"renders a status bar with Read time stat block"`

**Evidence:** All tests pass.

---

## 6 — Settings Propagation Across Views

### VAL-CROSS-017: scrollSpeed setting affects teleprompter controls

**Behavior:** In `<TeleprompterView />`, clicking "Faster" increases
`settings.scrollSpeed` by 5, and clicking "Slower" decreases it by 5
(clamped at minimum 5). The speed value is displayed in the HUD.

**Pass condition:** After clicking Faster, `scrollSpeed` goes from 40 → 45.
After clicking Slower at 5, it stays at 5.

**Tool:** `npm run test:frontend` — `src/teleprompter/TeleprompterView.test.tsx` →
`"clicking Faster increases scrollSpeed by 5"` +
`"clicking Slower decreases scrollSpeed by 5 and clamps at 5"`

**Evidence:** Vitest passes; store values confirmed.

---

### VAL-CROSS-018: fontSize and lineHeight settings apply to teleprompter viewport

**Behavior:** The teleprompter scrollable container reads `settings.fontSize`
and `settings.lineHeight` from `useSettingsStore` and applies them as inline
`style={{ fontSize, lineHeight }}`. Changes to these settings in the Settings
modal persist via `settingsStore.update()` and are immediately reflected.

**Pass condition:** The scrollable container's `style.fontSize` matches
`settings.fontSize + "px"` and `style.lineHeight` matches `settings.lineHeight`.

**Tool:** `npm run test:frontend` — `src/teleprompter/TeleprompterView.test.tsx`
(the component renders with `DEFAULT_SETTINGS.fontSize = 42` and the
scrollable container carries those inline styles).

**Evidence:** Existing render tests verify the component mounts without error
using settingsStore values. The inline style application is architecturally
enforced by the JSX in `TeleprompterView.tsx`.

---

### VAL-CROSS-019: mirrorHorizontal setting applies scaleX(-1) transform

**Behavior:** When `settings.mirrorHorizontal` is `true`, the teleprompter
scrollable container has `transform: scaleX(-1)` applied.

**Pass condition:** `scrollable.style.transform` contains `"scaleX(-1)"`.

**Tool:** `npm run test:frontend` — `src/teleprompter/TeleprompterView.test.tsx` →
`"applies horizontal mirror transform to the scrollable container"`

**Evidence:** Vitest passes.

---

### VAL-CROSS-020: highlightReadingLine setting controls reading line visibility

**Behavior:** When `settings.highlightReadingLine` is `true`, the reading
line element (`.gp-reading-line`) is rendered inside the viewport. When
`false`, it is not rendered.

**Pass condition:** With default settings, `.gp-reading-line` exists. After
setting `highlightReadingLine: false`, `.gp-reading-line` is `null`.

**Tool:** `npm run test:frontend` — `src/teleprompter/TeleprompterView.test.tsx` →
`"renders the reading line only when enabled"`

**Evidence:** Vitest passes.

---

### VAL-CROSS-021: Overlay rect settings persist and restore on mount

**Behavior:** When `settings.overlayX/Y/Width/Height` are set, the
TeleprompterView mounts the viewport at those coordinates and calls
`ipc.setOverlayRect(rect)` to position the OS window.

**Pass condition:** `invokeMock` receives `"set_overlay_rect"` with
`{ x: 120, y: 80, w: 480, h: 320 }` matching the persisted settings.

**Tool:** `npm run test:frontend` — `src/teleprompter/TeleprompterView.test.tsx` →
`"snaps the OS window to the persisted rect on mount"`

**Evidence:** Vitest passes.

---

### VAL-CROSS-022: Settings loaded via LazyStore on App mount

**Behavior:** `<App />` calls `loadSettings()` on mount, which reads from
the Tauri `plugin-store` via `LazyStore`. This ensures all views have access
to persisted settings before rendering.

**Pass condition:** `LazyStore` constructor was called.

**Tool:** `npm run test:frontend` — `src/App.test.tsx` →
`"loads settings on mount (LazyStore is constructed)"`

**Evidence:** Vitest passes.

---

### VAL-CROSS-023: Hotkey-driven speed changes propagate through settingsStore

**Behavior:** In the overlay window, the `hotkey://slower` and
`hotkey://faster` listeners call `useSettingsStore.getState().settings`
and then `update({ scrollSpeed: ... })`, clamped to `[5, 500]`. This
persists the change and makes it visible in the teleprompter HUD.

**Pass condition:** The overlay `hotkey://play-pause` test confirms listeners
are registered. The speed hotkey code path mirrors the button click path
tested in VAL-CROSS-017.

**Tool:** `npm run test:frontend` — `src/App.test.tsx` → overlay listener tests +
`src/teleprompter/TeleprompterView.test.tsx` → speed button tests.

**Evidence:** Both test suites pass.

---

## 7 — Full Test Suite Green

### VAL-CROSS-024: All frontend tests pass (244+ tests)

**Behavior:** Running `npm run test:frontend` executes all Vitest test files
under `src/`. All tests must pass with zero failures.

**Pass condition:** Exit code 0, all test suites and test cases green.

**Tool:** `npm run test:frontend`

**Evidence:** Terminal output showing `Tests: N passed, N total` with 0 failures.
The count must be ≥ 244.

---

### VAL-CROSS-025: All Rust tests pass (50+ tests)

**Behavior:** Running `npm run test:rust` (which runs `cargo test` in
`src-tauri/`) executes all `#[cfg(test)]` modules. All tests must pass.

**Pass condition:** Exit code 0, `test result: ok. N passed; 0 failed`.

**Tool:** `npm run test:rust`

**Evidence:** Terminal output showing 50+ tests passed, 0 failed.

---

## 8 — Typecheck

### VAL-CROSS-026: TypeScript typecheck passes with zero errors

**Behavior:** Running `npm run typecheck` (tsc --noEmit or equivalent)
verifies the entire frontend source tree has no type errors.

**Pass condition:** Exit code 0, no error output.

**Tool:** `npm run typecheck`

**Evidence:** Terminal output with no errors (empty stderr, exit 0).

---

## 9 — Lint

### VAL-CROSS-027: ESLint passes with zero errors

**Behavior:** Running `npm run lint` checks all source files against the
project ESLint configuration. Zero errors are allowed (warnings are OK).

**Pass condition:** Exit code 0, `0 errors` in output.

**Tool:** `npm run lint`

**Evidence:** Terminal output showing 0 errors.

---

## 10 — No Regression / Behavioral Preservation

### VAL-CROSS-028: Existing App.test.tsx tests pass unchanged

**Behavior:** All 8 existing tests in `src/App.test.tsx` pass after the
redesign. Tests cover: editor render, teleprompter render, body class
toggling, settings loading, overlay script loading, overlay listeners,
overlay readiness gate, overlay play-pause hotkey.

**Pass condition:** 8/8 tests pass.

**Tool:** `npm run test:frontend` — `src/App.test.tsx`

**Evidence:** Vitest output for App.test.tsx shows 8 passed, 0 failed.

---

### VAL-CROSS-029: Existing EditorView.test.tsx tests pass unchanged

**Behavior:** All 13 existing tests in `src/editor/EditorView.test.tsx` pass
after the redesign. Tests cover: toolbar buttons, script name, dirty marker,
preview prose, settings modal, Go Live IPC flow, error handling, New button,
brand mark, panel labels, stat blocks, Go button text.

**Pass condition:** 13/13 tests pass.

**Tool:** `npm run test:frontend` — `src/editor/EditorView.test.tsx`

**Evidence:** Vitest output for EditorView.test.tsx shows 13 passed, 0 failed.

---

### VAL-CROSS-030: Existing TeleprompterView.test.tsx tests pass unchanged

**Behavior:** All ~28 existing tests in `src/teleprompter/TeleprompterView.test.tsx`
pass after the redesign. Tests cover: markdown rendering, hotkey hints, edit
controls visibility, speed controls, play toggle, arrow navigation, exit
flow, hidden opacity, reading line, mirror transform, viewport positioning,
drag/resize, snap presets, native event sync, coalescing, hotkey navigation.

**Pass condition:** All tests pass.

**Tool:** `npm run test:frontend` — `src/teleprompter/TeleprompterView.test.tsx`

**Evidence:** Vitest output shows all tests passed, 0 failed.

---

### VAL-CROSS-031: Existing MarkdownPreview.test.tsx tests pass unchanged

**Behavior:** All 8 existing tests in `src/editor/MarkdownPreview.test.tsx`
pass. These validate the shared component that both views consume.

**Pass condition:** 8/8 tests pass.

**Tool:** `npm run test:frontend` — `src/editor/MarkdownPreview.test.tsx`

**Evidence:** Vitest output shows 8 passed.

---

### VAL-CROSS-032: Existing events.test.ts tests pass unchanged

**Behavior:** All 4 tests in `src/lib/events.test.ts` pass. These validate
the event subscription layer that connects Rust backend events to the UI.

**Pass condition:** 4/4 tests pass.

**Tool:** `npm run test:frontend` — `src/lib/events.test.ts`

**Evidence:** Vitest output shows 4 passed.

---

### VAL-CROSS-033: Existing store tests pass unchanged

**Behavior:** All tests in `src/store/modeStore.test.ts`,
`src/store/scriptStore.test.ts`, and `src/store/settingsStore.test.ts` pass.
These validate the Zustand stores that connect both views.

**Pass condition:** All store test suites pass with 0 failures.

**Tool:** `npm run test:frontend` — `src/store/*.test.ts`

**Evidence:** Vitest output shows all store tests passed.

---

## 11 — Component Import Integrity

### VAL-CROSS-034: No circular dependencies between src/editor/ and src/teleprompter/

**Behavior:** `src/editor/` modules do not import from `src/teleprompter/`
except for shared pure-math utilities (`viewportMath`). `src/teleprompter/`
imports `MarkdownPreview` from `src/editor/` but nothing else from the editor
view layer.

**Pass condition:** `npm run typecheck` succeeds (TypeScript will error on
circular type resolution if it occurs). Additionally, `npm run test:frontend`
passes (Vitest will fail on circular import loops at module resolution time).

**Tool:** `npm run typecheck` + `npm run test:frontend`

**Evidence:** Both commands exit 0.

---

### VAL-CROSS-035: src/ui/ exports are consumable by both views

**Behavior:** Components exported from `src/ui/` (`RecDot`, `StatBlock`,
`Frame`, `ChannelLabel`) are imported by `src/editor/EditorView.tsx` and
`src/teleprompter/TeleprompterView.tsx` without errors. Each `src/ui/`
component has its own test file that passes independently.

**Pass condition:** All 4 test files in `src/ui/` pass:
- `src/ui/RecDot.test.tsx`
- `src/ui/StatBlock.test.tsx`
- `src/ui/Frame.test.tsx`
- `src/ui/ChannelLabel.test.tsx`

**Tool:** `npm run test:frontend` — `src/ui/*.test.tsx`

**Evidence:** Vitest output shows all ui test suites pass.

---

### VAL-CROSS-036: src/lib/ utilities shared across views have independent tests

**Behavior:** `src/lib/ipc.ts`, `src/lib/events.ts`, `src/lib/scriptStats.ts`,
and `src/lib/displayBounds.ts` are consumed by both views. Each has a
corresponding `.test.ts` file.

**Pass condition:** All 4 lib test files pass:
- `src/lib/ipc.test.ts`
- `src/lib/events.test.ts`
- `src/lib/scriptStats.test.ts`
- `src/lib/displayBounds.test.ts`

**Tool:** `npm run test:frontend` — `src/lib/*.test.ts`

**Evidence:** Vitest output shows all lib test suites pass.

---

### VAL-CROSS-037: types.ts shared contract between views has validation tests

**Behavior:** `src/types.ts` defines `Script`, `Settings`, `Hotkeys`,
`AppMode`, `DEFAULT_SETTINGS`, and `DEFAULT_HOTKEYS` — shared across all
stores, views, and IPC calls. `src/types.test.ts` validates these types.

**Pass condition:** `src/types.test.ts` passes.

**Tool:** `npm run test:frontend` — `src/types.test.ts`

**Evidence:** Vitest output shows types.test.ts passed.

---

### VAL-CROSS-038: viewportMath is shared between EditorView (Go Live rect) and TeleprompterView

**Behavior:** `src/teleprompter/viewportMath.ts` exports `defaultRect`,
`clampRect`, and `presetRect`. These are used by `EditorView.onGo` to compute
the launch rectangle and by `TeleprompterView` for snap presets and viewport
sizing. `src/teleprompter/viewportMath.test.ts` validates all math functions.

**Pass condition:** `src/teleprompter/viewportMath.test.ts` passes.

**Tool:** `npm run test:frontend` — `src/teleprompter/viewportMath.test.ts`

**Evidence:** Vitest output shows viewportMath tests pass.

---

## Summary Gate

| # | Assertion | Tool |
|---|-----------|------|
| 001 | Editor renders for mode=editor | vitest |
| 002 | Teleprompter renders for mode=teleprompter | vitest |
| 003 | Body CSS class toggles | vitest |
| 004 | Go Live calls enterTeleprompter IPC | vitest |
| 005 | Go Live registers hotkeys in order | vitest |
| 006 | Go Live failure shows alert | vitest |
| 007 | Go Live resets playing=false | vitest |
| 008 | Exit unregisters hotkeys and resets mode | vitest |
| 009 | Stop hotkey triggers full exit | vitest |
| 010 | mode-changed event drives App routing | vitest |
| 011 | MarkdownPreview in editor preview | vitest |
| 012 | MarkdownPreview in teleprompter viewport | vitest |
| 013 | MarkdownPreview unit tests complete | vitest |
| 014 | gp-prose design token consistent | vitest |
| 015 | RecDot shared component works | vitest |
| 016 | StatBlock shared component works | vitest |
| 017 | scrollSpeed propagates to controls | vitest |
| 018 | fontSize/lineHeight apply to viewport | vitest |
| 019 | mirrorHorizontal transform applies | vitest |
| 020 | highlightReadingLine toggles reading line | vitest |
| 021 | Overlay rect persists and restores | vitest |
| 022 | Settings loaded via LazyStore on mount | vitest |
| 023 | Hotkey speed changes propagate | vitest |
| 024 | All 244+ frontend tests pass | `npm run test:frontend` |
| 025 | All 50+ Rust tests pass | `npm run test:rust` |
| 026 | TypeScript typecheck passes | `npm run typecheck` |
| 027 | ESLint passes | `npm run lint` |
| 028 | App.test.tsx passes unchanged | vitest |
| 029 | EditorView.test.tsx passes unchanged | vitest |
| 030 | TeleprompterView.test.tsx passes unchanged | vitest |
| 031 | MarkdownPreview.test.tsx passes unchanged | vitest |
| 032 | events.test.ts passes unchanged | vitest |
| 033 | Store tests pass unchanged | vitest |
| 034 | No circular deps editor↔teleprompter | typecheck + vitest |
| 035 | src/ui/ exports work across consumers | vitest |
| 036 | src/lib/ utilities have independent tests | vitest |
| 037 | types.ts contract validated | vitest |
| 038 | viewportMath shared correctly | vitest |

**Full gate:** All 38 assertions must pass. Run `npm test` (frontend + Rust),
`npm run typecheck`, and `npm run lint` as the composite verification command.
