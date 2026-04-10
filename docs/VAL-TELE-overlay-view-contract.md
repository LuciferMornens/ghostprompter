# Milestone 3 — Overlay / Teleprompter View Polish: Validation Contract

> **Tool:** `npm run test:frontend` (Vitest + React Testing Library, jsdom)  
> **Evidence:** test output green, `npm run typecheck` clean  
> **Source files under test:**  
> `src/teleprompter/TeleprompterView.tsx`, `ReadingLine.tsx`, `useAutoScroll.ts`, `viewportMath.ts`  
> **Test files:**  
> `src/teleprompter/TeleprompterView.test.tsx`, `ReadingLine.test.tsx`, `useAutoScroll.test.ts`, `viewportMath.test.ts`

---

## 1 — Viewport Panel Structure

### VAL-TELE-001: Viewport panel renders with `data-gp-viewport` and `gp-vp` class
The root viewport `<div>` must carry `data-gp-viewport` attribute and class `gp-vp`.  
**Pass:** `container.querySelector('[data-gp-viewport].gp-vp')` is non-null.  
**Fail:** element missing or attribute/class absent.

### VAL-TELE-002: Viewport panel is positioned flush at (0, 0) regardless of stored overlay coordinates
The viewport `left` and `top` inline styles must always be `"0px"` because the OS window is moved via IPC, not the DOM panel.  
**Pass:** `viewport.style.left === '0px' && viewport.style.top === '0px'` when `overlayX`/`overlayY` are non-zero.  
**Fail:** inline position reflects stored coordinates instead of 0.

### VAL-TELE-003: Viewport width and height reflect persisted `overlayWidth`/`overlayHeight`
When settings contain `overlayWidth: 480, overlayHeight: 320`, the viewport inline style must read `width: 480px; height: 320px`.  
**Pass:** parsed width/height match settings values.  
**Fail:** dimensions differ or are absent.

### VAL-TELE-004: Viewport snaps OS window to persisted rect on mount via `set_overlay_rect`
On first render with non-null `overlayX/Y`, `invoke('set_overlay_rect', { x, y, w, h })` must be called exactly once with the persisted values.  
**Pass:** invoke mock shows one `set_overlay_rect` call matching persisted rect.  
**Fail:** missing call, or coordinates differ.

### VAL-TELE-005: Viewport uses computed default rect when overlayX/Y are null
With `overlayX: null, overlayY: null`, the component must compute `defaultRect(screen)` and both render it and persist it via `update()`.  
**Pass:** viewport dimensions > MIN_SIZE; settings store receives non-null overlay coordinates after mount.  
**Fail:** viewport renders zero-size, or overlay stays null.

### VAL-TELE-006: Scrollable content container uses pixel-based padding from panel height
Padding must be `Math.round(rect.h * readingLineOffset)` top and `Math.round(rect.h * (1 - readingLineOffset))` bottom, not CSS `%` or `vh`.  
**Pass:** with `overlayHeight: 400, readingLineOffset: 0.5` → `paddingTop: '200px'`, `paddingBottom: '200px'`.  
**Fail:** padding uses percentage or wrong calculation.

### VAL-TELE-007: Horizontal padding derived from panel width
Left and right padding must be `Math.round(rect.w * 0.06)`.  
**Pass:** with `overlayWidth: 800` → `paddingLeft: '48px'`, `paddingRight: '48px'`.  
**Fail:** wrong value or missing.

---

## 2 — ReadingLine

### VAL-TELE-010: ReadingLine renders with `gp-reading-line` class
The `<ReadingLine offset={0.4} />` must produce a DOM element with class `gp-reading-line`.  
**Pass:** `container.querySelector('.gp-reading-line')` is non-null.  
**Fail:** element missing.

### VAL-TELE-011: ReadingLine top position matches offset percentage
For offset values `0`, `0.4`, `0.5`, `1`, the inline `top` style must be `"0%"`, `"40%"`, `"50%"`, `"100%"` respectively.  
**Pass:** `el.style.top === '${offset * 100}%'` for each value.  
**Fail:** mismatch.

### VAL-TELE-012: ReadingLine has `aria-hidden="true"`
The reading line is decorative and must be hidden from the accessibility tree.  
**Pass:** `el.getAttribute('aria-hidden') === 'true'`.  
**Fail:** attribute missing or `"false"`.

### VAL-TELE-013: ReadingLine only renders when `highlightReadingLine` is true
With `highlightReadingLine: true`, the `.gp-reading-line` element must exist inside `[data-gp-viewport]`. With `false`, it must not.  
**Pass:** presence/absence toggles correctly on re-render.  
**Fail:** always present or always absent.

### VAL-TELE-014: ReadingLine is scoped inside the viewport panel
The `.gp-reading-line` element must be a descendant of the `[data-gp-viewport]` container, not a sibling.  
**Pass:** `viewport.querySelector('.gp-reading-line')` is non-null.  
**Fail:** reading line is outside the viewport.

---

## 3 — HUD Elements

### VAL-TELE-020: Status chip shows "Rolling" with `RecDot` when playing
With `playing: true`, the top-left HUD must contain a `<RecDot active={true} />` and text `"Rolling"`.  
**Pass:** `screen.getByText('Rolling')` found; RecDot rendered with active prop.  
**Fail:** text is "Standby" or RecDot missing.

### VAL-TELE-021: Status chip shows "Standby" when paused
With `playing: false`, the top-left HUD must show `"Standby"`.  
**Pass:** `screen.getByText('Standby')` found.  
**Fail:** text is "Rolling".

### VAL-TELE-022: Script name is displayed in the top-left HUD
The script name from `scriptStore` must appear truncated with ellipsis styling in the HUD.  
**Pass:** `screen.getByText(scriptName)` found where `scriptName` matches store value.  
**Fail:** script name not rendered.

### VAL-TELE-023: Speed readout renders current `scrollSpeed` with unit
The top-right HUD must display the numeric speed value from `settings.scrollSpeed` and the unit `"px/s"`.  
**Pass:** text matching the current speed value and `"px/s"` are both present in the right HUD.  
**Fail:** speed not rendered or wrong value.

### VAL-TELE-024: HUD chips are hidden when `hidden=true`
With `useModeStore.setState({ hidden: true })`, neither HUD region renders.  
**Pass:** no elements with class `gp-vp-hud` present.  
**Fail:** HUD elements still in the DOM.

### VAL-TELE-025: Root container opacity is 0 when hidden
With `hidden: true`, the root `<div>` must have inline `opacity: 0`.  
**Pass:** `(container.firstChild as HTMLElement).style.opacity === '0'`.  
**Fail:** opacity is 1 or unset.

---

## 4 — Control Cluster in Edit Mode

### VAL-TELE-030: Control cluster renders all buttons when `editMode=true`
When `editMode` is true, the following titled buttons must all be present: `"Slower"`, `"Faster"`, `"Play"` (or `"Pause"`), `"Line up"`, `"Line down"`, `"Snap"`, `"Lock overlay"`, `"Exit teleprompter"`.  
**Pass:** `screen.getByTitle(name)` succeeds for each button.  
**Fail:** any button missing.

### VAL-TELE-031: Control cluster has `role="toolbar"` and proper `aria-label`
The cluster container must have `role="toolbar"` with `aria-label="Teleprompter controls"`.  
**Pass:** `screen.getByRole('toolbar', { name: 'Teleprompter controls' })` found.  
**Fail:** role or label missing.

### VAL-TELE-032: Drag region element present in edit mode
A `[data-tauri-drag-region]` element must be present in the DOM when `editMode=true`.  
**Pass:** `container.querySelector('[data-tauri-drag-region]')` non-null.  
**Fail:** element absent.

---

## 5 — Controls Hidden When Not in Edit Mode

### VAL-TELE-040: No control buttons render when `editMode=false`
With `editMode: false`, queries for `"Lock overlay"`, `"Exit teleprompter"`, `"Snap"`, `"Slower"`, `"Faster"` must return null.  
**Pass:** `screen.queryByTitle(name) === null` for each.  
**Fail:** any button found.

### VAL-TELE-041: Hotkey hint shown when not in edit mode
With `editMode: false, hidden: false`, a hint containing `"F6 edit"` must be visible.  
**Pass:** `screen.getAllByText(/F6 edit/i).length > 0`.  
**Fail:** hint absent.

### VAL-TELE-042: Hotkey hint hidden when `hidden=true`
With `hidden: true`, the hint text must not render (the `!hidden` guard in JSX).  
**Pass:** `screen.queryByText(/F6 edit/i) === null`.  
**Fail:** hint still present.

### VAL-TELE-043: Root pointer-events disabled when not in edit mode
With `editMode: false`, the root container must have `pointerEvents: 'none'`.  
**Pass:** `root.style.pointerEvents === 'none'`.  
**Fail:** pointer events enabled at root level.

### VAL-TELE-044: Viewport panel keeps pointer-events enabled regardless of edit mode
Even when root has `pointerEvents: 'none'`, the `[data-gp-viewport]` must have `pointerEvents: 'auto'` to remain interactive for the scrollable area.  
**Pass:** `viewport.style.pointerEvents === 'auto'`.  
**Fail:** viewport pointer events disabled.

---

## 6 — Snap Popover

### VAL-TELE-050: Snap button opens the snap popover
Clicking the `"Snap"` button must mount a `[data-gp-snap-popover]` element.  
**Pass:** after click, `container.querySelector('[data-gp-snap-popover]')` non-null.  
**Fail:** popover absent.

### VAL-TELE-051: Snap popover is initially closed
On mount with `editMode: true`, no `[data-gp-snap-popover]` must exist.  
**Pass:** `container.querySelector('[data-gp-snap-popover]') === null`.  
**Fail:** popover present on mount.

### VAL-TELE-052: Snap popover displays 3×3 position grid (9 cells)
The popover must contain exactly 9 `.gp-snap-cell` buttons corresponding to the `SNAP_GRID` layout (`tl, tc, tr, ml, mc, mr, bl, bc, br`).  
**Pass:** `querySelectorAll('.gp-snap-cell').length === 9` and each has the correct `aria-label`.  
**Fail:** wrong count or missing labels.

### VAL-TELE-053: Snap popover displays 5 strip/edge/full presets
The popover must contain 5 `.gp-snap-strip` buttons: `"Top strip"`, `"Bottom strip"`, `"Left column"`, `"Right column"`, `"Full screen"`.  
**Pass:** all 5 menuitems with correct labels found.  
**Fail:** any missing.

### VAL-TELE-054: Snap popover has `role="menu"` with `aria-label="Snap presets"`
The popover root must carry ARIA menu semantics.  
**Pass:** `screen.getByRole('menu', { name: 'Snap presets' })` found.  
**Fail:** role or label missing.

### VAL-TELE-055: Picking "Full screen" persists full-screen rect and calls `set_overlay_rect`
After selecting Full screen, settings must store `overlayX: 0, overlayY: 0, overlayWidth: screen.w, overlayHeight: screen.h` and `invoke('set_overlay_rect')` must be called with matching values.  
**Pass:** settings match and IPC call confirmed.  
**Fail:** coordinates differ or IPC not called.

### VAL-TELE-056: Picking "Top right" snaps flush to top-right corner
After selecting Top right, `overlayY === 0` and `overlayX + overlayWidth === screen.w`.  
**Pass:** values satisfy flush-corner condition.  
**Fail:** gap or overlap.

### VAL-TELE-057: Active preset cell gets `gp-snap-cell--active` class
When the current rect matches a preset's computed position (within 2px tolerance), that cell must carry the `--active` modifier class.  
**Pass:** matching cell has `gp-snap-cell--active`.  
**Fail:** no cell highlighted or wrong cell highlighted.

### VAL-TELE-058: Popover closes on outside click
When snap popover is open, a `mousedown` on a target outside `snapPopoverRef` must close the popover.  
**Pass:** after outside click, `[data-gp-snap-popover]` removed from DOM.  
**Fail:** popover remains.

### VAL-TELE-059: Popover closes on Escape key
With the popover open, pressing `Escape` must close it.  
**Pass:** after Escape keydown, `[data-gp-snap-popover]` removed from DOM.  
**Fail:** popover remains.

---

## 7 — Speed Controls

### VAL-TELE-060: Clicking "Faster" increments `scrollSpeed` by 5
With initial `scrollSpeed: 40`, clicking `"Faster"` must set `scrollSpeed` to `45` in the settings store.  
**Pass:** `useSettingsStore.getState().settings.scrollSpeed === 45`.  
**Fail:** value unchanged or wrong.

### VAL-TELE-061: Clicking "Slower" decrements `scrollSpeed` by 5
With initial `scrollSpeed: 40`, clicking `"Slower"` must set `scrollSpeed` to `35`.  
**Pass:** `useSettingsStore.getState().settings.scrollSpeed === 35`.  
**Fail:** value unchanged or wrong.

### VAL-TELE-062: Speed clamps at lower bound of 5
With `scrollSpeed: 5`, clicking `"Slower"` must not go below 5.  
**Pass:** `scrollSpeed` remains `5` after click.  
**Fail:** value below 5 or negative.

### VAL-TELE-063: Speed clamps at upper bound of 500
With `scrollSpeed: 500`, clicking `"Faster"` must not exceed 500.  
**Pass:** `scrollSpeed` remains `500`.  
**Fail:** value above 500.

### VAL-TELE-064: Speed readout in control cluster updates live
After clicking Faster, the speed display in the cluster (`.gp-vp-speed-value`) must reflect the new value.  
**Pass:** text content matches updated speed.  
**Fail:** stale value.

---

## 8 — Play/Pause Toggle

### VAL-TELE-070: Play button toggles `playing` from false to true
With `playing: false`, clicking the Play button (`title="Play"`) must set `useModeStore.playing` to `true`.  
**Pass:** `useModeStore.getState().playing === true`.  
**Fail:** playing unchanged.

### VAL-TELE-071: Pause button toggles `playing` from true to false
With `playing: true`, the button shows `title="Pause"`. Clicking it must set `playing` to `false`.  
**Pass:** `useModeStore.getState().playing === false`.  
**Fail:** playing unchanged.

### VAL-TELE-072: Play button label swaps between "▶" and "⏸"
When `playing=false`, the button symbol must be `"▶"`; when `playing=true`, `"⏸"`.  
**Pass:** correct symbol rendered for each state.  
**Fail:** wrong symbol.

### VAL-TELE-073: Spacebar toggles play/pause in edit mode
With `editMode: true`, pressing Space on the window must toggle `playing`.  
**Pass:** playing state inverts after Space keydown.  
**Fail:** no toggle.

### VAL-TELE-074: Spacebar does NOT toggle play/pause when not in edit mode
With `editMode: false`, pressing Space must not change `playing` state.  
**Pass:** playing unchanged after keydown.  
**Fail:** state toggles.

---

## 9 — Line Up/Down Buttons

### VAL-TELE-080: "Line down" button scrolls content forward and pauses playback
With `playing: true`, clicking `"Line down"` must increase `scrollRef.current.scrollTop` by `fontSize * lineHeight * 1.5` and set `playing` to `false`.  
**Pass:** scrollTop increased by expected delta; playing is false.  
**Fail:** no scroll or still playing.

### VAL-TELE-081: "Line up" button scrolls content backward and pauses playback
With `playing: true`, clicking `"Line up"` must decrease `scrollTop` by the same line-height delta and pause.  
**Pass:** scrollTop decreased; playing is false.  
**Fail:** no scroll or still playing.

### VAL-TELE-082: Arrow keys scroll content in edit mode
ArrowDown/ArrowUp dispatched on `window` with `editMode: true` must scroll down/up respectively and pause if playing.  
**Pass:** scrollTop changes in correct direction; playing set to false.  
**Fail:** no scroll.

### VAL-TELE-083: Arrow keys do NOT scroll when target is an editable element
If `event.target` is an `<input>`, `<textarea>`, `<select>`, or `contentEditable` element, arrow keys must be ignored by the teleprompter handler.  
**Pass:** scrollTop unchanged, event not `preventDefault()`-ed by the handler.  
**Fail:** scroll occurs on editable input.

---

## 10 — Lock and Exit Buttons

### VAL-TELE-090: "Lock overlay" button calls `toggleEdit` and invokes `set_edit_mode`
Clicking `"Lock overlay"` must toggle `editMode` in modeStore and call `invoke('set_edit_mode', { edit: false })` (since it transitions from edit to locked).  
**Pass:** editMode toggles and IPC call made.  
**Fail:** state unchanged or no IPC.

### VAL-TELE-091: "Exit teleprompter" unregisters hotkeys, exits mode, resets state
Clicking `"Exit teleprompter"` must call `invoke('unregister_hotkeys')` then `invoke('exit_teleprompter_mode')`, set `playing: false`, `editMode: false`, `mode: 'editor'`.  
**Pass:** both IPC calls confirmed in order; modeStore matches expected state.  
**Fail:** any IPC call missing or state incorrect.

---

## 11 — Drag Handle

### VAL-TELE-100: Drag handle present only in edit mode
The `[data-gp-drag-handle]` element must exist when `editMode: true` and be absent when `false`.  
**Pass:** presence toggles correctly.  
**Fail:** always present or always absent.

### VAL-TELE-101: Pointer down on drag handle calls `startDragging()`
Dispatching a `pointerdown` event on the drag handle must invoke `getCurrentWindow().startDragging()`.  
**Pass:** `startDraggingMock` called once.  
**Fail:** not called.

### VAL-TELE-102: Drag handle has correct aria attributes
The drag handle must have `aria-label="Drag to move"`, `role="button"`, `tabIndex={-1}`.  
**Pass:** all attributes present with correct values.  
**Fail:** any missing.

### VAL-TELE-103: Pointer down on drag handle is no-op when not in edit mode
If `editMode: false`, the handler early-returns; `startDragging` must NOT be called.  
**Pass:** `startDraggingMock` not called.  
**Fail:** called.

---

## 12 — Resize Handles

### VAL-TELE-110: All 8 resize edges/corners present in edit mode
In edit mode, the following must exist: 4 edge elements (`gp-vp-edge--n`, `gp-vp-edge--s`, `gp-vp-edge--e`, `gp-vp-edge--w`) and 4 corner elements (`gp-vp-corner--nw`, `gp-vp-corner--ne`, `gp-vp-corner--sw`, `gp-vp-corner--se`).  
**Pass:** all 8 elements found via class selectors.  
**Fail:** any missing.

### VAL-TELE-111: Resize handles absent when not in edit mode
With `editMode: false`, no `.gp-vp-edge` or `.gp-vp-corner` elements exist.  
**Pass:** query returns empty.  
**Fail:** elements found.

### VAL-TELE-112: SE resize grip calls `startResizeDragging('SouthEast')`
Pointer down on `[data-gp-resize-grip]` must call `startResizeDragging` with direction `"SouthEast"`.  
**Pass:** mock called with correct argument.  
**Fail:** wrong direction or not called.

### VAL-TELE-113: SE resize grip has accessible attributes
The grip must have `aria-label="Resize"`, `role="button"`, `tabIndex={-1}`.  
**Pass:** all attributes correct.  
**Fail:** any missing.

### VAL-TELE-114: Each edge/corner calls `startResizeDragging` with the correct direction
Pointer down on the North edge must call `startResizeDragging('North')`, West must call `'West'`, NE corner must call `'NorthEast'`, etc.  
**Pass:** mock receives the matching `ResizeDirection` string for each element.  
**Fail:** wrong direction.

---

## 13 — Auto-Scroll Behavior

### VAL-TELE-120: No rAF scheduled when `playing=false`
`useAutoScroll(ref, 60, false)` must not call `requestAnimationFrame`.  
**Pass:** rAF queue empty.  
**Fail:** rAF scheduled.

### VAL-TELE-121: rAF scheduled immediately when `playing=true`
`useAutoScroll(ref, 60, true)` must schedule exactly one rAF.  
**Pass:** rAF queue length === 1.  
**Fail:** no rAF or multiple.

### VAL-TELE-122: scrollTop advances by `speed × dt`
After 1 second at speed 60, `scrollTop` must be ≈60.  
**Pass:** `scrollTop` within ±0.001 of 60.  
**Fail:** value wrong.

### VAL-TELE-123: scrollTop accumulates across multiple ticks
Multiple sequential rAF ticks at speed 100 with 500ms intervals must yield cumulative scroll.  
**Pass:** after 3 ticks (500ms + 500ms + 250ms), `scrollTop ≈ 125`.  
**Fail:** scroll resets or drifts.

### VAL-TELE-124: Sub-pixel accumulation preserved when scrollTop rounds
With a rounding `scrollTop` setter and low speed (20px/s), 10 frames at 16ms must still advance scroll position above 0.  
**Pass:** `scrollTop > 0` after burst.  
**Fail:** stuck at 0 due to rounding.

### VAL-TELE-125: Scrolling stops at bottom boundary
When `scrollTop` reaches `scrollHeight - clientHeight - 1`, the rAF loop must stop (no further frames scheduled).  
**Pass:** rAF queue empty after reaching end.  
**Fail:** frames keep scheduling.

### VAL-TELE-126: `onStop` callback fires when reaching the bottom
The optional `onStop` callback must be called exactly once when scrolling reaches the end.  
**Pass:** `onStop` called once.  
**Fail:** not called or called multiple times.

### VAL-TELE-127: `cancelAnimationFrame` called on unmount while playing
Unmounting the hook while playing must cancel the pending rAF.  
**Pass:** `cancelAnimationFrame` called with the correct rAF id.  
**Fail:** no cancellation.

### VAL-TELE-128: Effect re-registers when speed changes
Changing speed from 60 to 120 must cancel the old rAF, schedule a new one, and advance at the new speed.  
**Pass:** after re-render, 1 second tick at speed 120 yields ≈120px scroll.  
**Fail:** still scrolling at old speed.

### VAL-TELE-129: Does not crash when `ref.current` is null
Calling `useAutoScroll({ current: null }, 60, true)` must not throw during rAF ticks.  
**Pass:** no exception thrown.  
**Fail:** TypeError or crash.

---

## 14 — Viewport Math Utilities

### VAL-TELE-130: `clampRect` prevents rect from exceeding right edge
A rect extending beyond screen right must be repositioned so `x + w ≤ screen.w`.  
**Pass:** `out.x + out.w <= screen.w`.  
**Fail:** overflow.

### VAL-TELE-131: `clampRect` prevents rect from exceeding bottom edge
A rect extending below screen must satisfy `y + h ≤ screen.h`.  
**Pass:** constraint satisfied.  
**Fail:** overflow.

### VAL-TELE-132: `clampRect` clamps negative coordinates to zero (or screen origin)
Negative `x`/`y` on primary display must clamp to 0.  
**Pass:** `out.x >= 0 && out.y >= 0`.  
**Fail:** negative coordinates.

### VAL-TELE-133: `clampRect` enforces MIN_SIZE (260×160)
A rect with `w: 10, h: 10` must be clamped to `w: 260, h: 160`.  
**Pass:** `out.w === MIN_SIZE.w && out.h === MIN_SIZE.h`.  
**Fail:** smaller than minimum.

### VAL-TELE-134: `clampRect` caps size at screen dimensions
A rect of `5000×5000` must be clamped to `screen.w × screen.h`.  
**Pass:** `out.w === screen.w && out.h === screen.h`.  
**Fail:** exceeds screen.

### VAL-TELE-135: `presetRect('full')` covers the entire screen
**Pass:** `{ x: 0, y: 0, w: screen.w, h: screen.h }`.  
**Fail:** any value differs.

### VAL-TELE-136: `presetRect('tr')` is flush top-right
**Pass:** `y === 0 && x + w === screen.w && w < screen.w && h < screen.h`.  
**Fail:** gap or overflow.

### VAL-TELE-137: `presetRect('mc')` is centered
**Pass:** center point `(x + w/2, y + h/2)` within 2px of `(screen.w/2, screen.h/2)`.  
**Fail:** off-center.

### VAL-TELE-138: `presetRect('top-strip')` spans full width at top
**Pass:** `x === 0, y === 0, w === screen.w, h < screen.h / 2`.  
**Fail:** not full width or wrong position.

### VAL-TELE-139: `defaultRect` places panel on right half, vertically centered
**Pass:** `x + w/2 > screen.w/2` and center Y within 10% of screen center.  
**Fail:** left-biased or poorly centered.

### VAL-TELE-140: `defaultRect` never exceeds screen bounds
**Pass:** `x >= 0, y >= 0, x + w <= screen.w, y + h <= screen.h`.  
**Fail:** any overflow.

### VAL-TELE-141: `defaultRect` preserves non-primary monitor origin
With `screen = { x: -1920, y: 40, w: 1720, h: 1000 }`, all coordinates must stay within the monitor's rectangle.  
**Pass:** `x >= -1920, y >= 40, x + w <= -200, y + h <= 1040`.  
**Fail:** coordinates outside monitor bounds.

### VAL-TELE-142: `applyMoveDelta` shifts by dx/dy
Shifting `(100, 100)` by `(50, -20)` must yield `(150, 80)` with unchanged size.  
**Pass:** exact match.  
**Fail:** wrong position or size changed.

### VAL-TELE-143: `applyMoveDelta` clamps at screen edges
Large negative delta must clamp `x` to 0; large positive must clamp `x + w` to `screen.w`.  
**Pass:** boundary conditions respected.  
**Fail:** overflow or negative.

### VAL-TELE-144: `applyResizeDelta` grows the rect
Adding `(50, 30)` to a `400×300` rect must yield `450×330`.  
**Pass:** exact match.  
**Fail:** wrong size.

### VAL-TELE-145: `applyResizeDelta` enforces minimum size on shrink
Shrinking by `(-500, -500)` must clamp to MIN_SIZE.  
**Pass:** `w === MIN_SIZE.w && h === MIN_SIZE.h`.  
**Fail:** below minimum.

### VAL-TELE-146: `applyResizeDelta` prevents growth beyond screen
Growing a rect near the edge by `(2000, 2000)` must not exceed screen bounds.  
**Pass:** `x + w <= screen.w && y + h <= screen.h`.  
**Fail:** overflow.

---

## 15 — Hotkey Event Handlers

### VAL-TELE-150: `line-down` hotkey pauses playback and scrolls forward
Firing `hotkey://line-down` with `playing: true` must set `playing: false` and increase `scrollTop`.  
**Pass:** playing false; scrollTop > initial value.  
**Fail:** still playing or no scroll.

### VAL-TELE-151: `line-up` hotkey pauses playback and scrolls backward
Firing `hotkey://line-up` must decrease scrollTop and pause.  
**Pass:** scrollTop < initial value; playing false.  
**Fail:** no scroll or still playing.

### VAL-TELE-152: `jump-start` hotkey jumps to top and pauses
Firing `hotkey://jump-start` from `scrollTop: 320` must set `scrollTop: 0` and pause.  
**Pass:** `scrollTop === 0 && playing === false`.  
**Fail:** not at top.

### VAL-TELE-153: `jump-end` hotkey jumps to bottom and pauses
Firing `hotkey://jump-end` must set `scrollTop` to `scrollHeight` and pause.  
**Pass:** `scrollTop === el.scrollHeight && playing === false`.  
**Fail:** not at bottom.

### VAL-TELE-154: All 10 hotkey action events are subscribed
The component must call `listen()` for all of: `play-pause`, `slower`, `faster`, `hide`, `edit-mode`, `line-up`, `line-down`, `jump-start`, `jump-end`, `stop`.  
**Pass:** `hotkeyListeners` map contains all 10 `hotkey://` prefixed keys (note: some may be subscribed in `App.tsx`; validate that all teleprompter-relevant ones — at minimum `line-up`, `line-down`, `jump-start`, `jump-end` — are registered by TeleprompterView).  
**Fail:** any expected subscription missing.

### VAL-TELE-155: Hotkey listeners are cleaned up on unmount
Unmounting the component must call the unlisten function returned from each `listen()` subscription.  
**Pass:** hotkey listener map is empty after unmount.  
**Fail:** stale listeners remain.

---

## 16 — Window Position/Size Sync

### VAL-TELE-160: Native `onMoved` event syncs position to settings store
Emitting a native move event with `toLogical` returning `{ x: 200, y: 140 }` must eventually update `overlayX: 200, overlayY: 140` in settings.  
**Pass:** settings match after `waitFor`.  
**Fail:** settings unchanged.

### VAL-TELE-161: Native `onResized` event syncs size to settings store
Emitting a native resize event with `toLogical` returning `{ width: 820, height: 640 }` must update `overlayWidth: 820, overlayHeight: 640`.  
**Pass:** settings match; viewport inline width/height update.  
**Fail:** settings or DOM unchanged.

### VAL-TELE-162: Burst of native events coalesced into one settings write
Firing 10 rapid resize events must result in exactly 1 call to `update()` with overlay rect fields (trailing debounce at 180ms).  
**Pass:** `rectWrites.length === 1` with final coalesced values.  
**Fail:** multiple writes.

### VAL-TELE-163: Monitor bounds refreshed after move gesture ends
After a move event settles, `currentMonitor()` must be re-invoked so snap presets target the correct display.  
**Pass:** `currentMonitorMock` call count increases after move + debounce.  
**Fail:** no refresh.

### VAL-TELE-164: Snap after cross-monitor move uses new monitor's bounds
Moving to a second monitor (negative-X origin) and then snapping Full screen must use the second monitor's resolution and origin.  
**Pass:** `set_overlay_rect` called with second monitor's bounds.  
**Fail:** rect uses primary monitor's bounds.

---

## 17 — Background Color/Opacity

### VAL-TELE-170: Viewport background uses `hexToRgba(bgColor, bgOpacity)`
With `bgColor: '#000000', bgOpacity: 0.75`, the viewport `background` inline style must be `"rgba(0, 0, 0, 0.75)"`.  
**Pass:** exact string match.  
**Fail:** different format or values.

### VAL-TELE-171: Short hex colors expanded correctly
`hexToRgba('#f00', 0.5)` must produce `"rgba(255, 0, 0, 0.5)"`.  
**Pass:** values correct.  
**Fail:** wrong expansion.

### VAL-TELE-172: Viewport text color from settings applied
The scrollable container must have `color` inline style matching `settings.textColor`.  
**Pass:** `scrollable.style.color === settings.textColor`.  
**Fail:** wrong color.

### VAL-TELE-173: Root container background is transparent
The outermost `<div>` must have `background: 'transparent'` to allow the frameless window to pass through.  
**Pass:** `root.style.background === 'transparent'`.  
**Fail:** opaque background.

---

## 18 — Glassmorphism Effects on Controls

### VAL-TELE-180: Control cluster uses `gp-vp-cluster` class for glassmorphism styling
The control toolbar must carry the `gp-vp-cluster` class which maps to backdrop-blur/glass CSS in the design system.  
**Pass:** element with `role="toolbar"` has class `gp-vp-cluster`.  
**Fail:** class missing.

### VAL-TELE-181: HUD chips use `gp-hud` and `gp-vp-hud` classes
Both top-left and top-right HUD containers must carry `gp-hud gp-vp-hud` classes for consistent glassmorphism application.  
**Pass:** all HUD containers have both classes.  
**Fail:** class missing.

### VAL-TELE-182: Snap popover uses `gp-snap-popover` class for glass effect
The `[data-gp-snap-popover]` element must have class `gp-snap-popover`.  
**Pass:** class present.  
**Fail:** class missing.

### VAL-TELE-183: Edit-mode border renders with `gp-edit-mode-border` class
In edit mode, a `.gp-edit-mode-border` element must exist inside the viewport for the visual border indicator.  
**Pass:** element found inside `[data-gp-viewport]`.  
**Fail:** element missing.

---

## 19 — Inline Components Extracted to Proper Modules

### VAL-TELE-190: `IconBtn` is defined and reusable
`IconBtn` must be a named function component accepting `children`, `onClick`, `title`, `ariaLabel`, `hot`, `compact`, `className` props with correct types.  
**Pass:** component renders buttons with all prop variations without TypeScript errors; `npm run typecheck` clean.  
**Fail:** type errors or missing props.

### VAL-TELE-191: `SnapPopover` accepts `onPick`, `current`, `screen` props
`SnapPopover` must be a separate function receiving `onPick: (p: Preset) => void`, `current: Rect`, `screen: ScreenSize`.  
**Pass:** typecheck clean; popover renders correctly when mounted.  
**Fail:** type errors.

### VAL-TELE-192: `hexToRgba` utility handles edge cases
- `hexToRgba('#000', 1)` → `"rgba(0, 0, 0, 1)"`
- `hexToRgba('#ffffff', 0)` → `"rgba(255, 255, 255, 0)"`
- `hexToRgba('abc', 0.5)` → correctly expands to `"rgba(170, 187, 204, 0.5)"`  

**Pass:** all conversions correct.  
**Fail:** any incorrect value.

---

## 20 — CSS Classes Use Design Tokens Consistently

### VAL-TELE-200: Typography uses CSS custom properties
Inline font styles must reference `var(--font-display)`, `var(--font-sans)`, `var(--font-mono)` — never hardcoded font names.  
**Pass:** source code search for `fontFamily` shows only `var(--font-*)` references.  
**Fail:** hardcoded font family strings.

### VAL-TELE-201: Colors reference design token variables
HUD text colors must use `var(--color-gp-paper)`, `var(--color-gp-paper-dim)`, `var(--color-gp-paper-dim-2)`, `var(--color-gp-mute)` — never hardcoded hex in inline styles for UI chrome.  
**Pass:** inline `color` properties for HUD/controls use `var(--color-gp-*)`.  
**Fail:** hardcoded hex values for chrome elements.

### VAL-TELE-202: Prose content uses `gp-prose gp-prose--stage` class
The markdown wrapper must carry both `gp-prose` (base) and `gp-prose--stage` (teleprompter variant) classes.  
**Pass:** `container.querySelector('.gp-prose.gp-prose--stage')` found.  
**Fail:** classes missing.

### VAL-TELE-203: Control buttons use `gp-icn` class system
All `IconBtn` instances must render `<button class="gp-icn ...">`. Hot state adds `gp-icn-hot`, compact adds `gp-icn--compact`, danger adds `gp-icn--danger`, primary adds `gp-icn--primary`.  
**Pass:** all button class combinations verified via rendered output.  
**Fail:** inconsistent class application.

### VAL-TELE-204: Transition easing uses `var(--gp-ease)` token
The root container's `transition` inline style must reference `var(--gp-ease)` for the opacity transition.  
**Pass:** `transition` string contains `var(--gp-ease)`.  
**Fail:** hardcoded easing.

---

## 21 — Full Test Coverage for Teleprompter Components

### VAL-TELE-210: All 4 source files have corresponding test files
Test files must exist for: `TeleprompterView.test.tsx`, `ReadingLine.test.tsx`, `useAutoScroll.test.ts`, `viewportMath.test.ts`.  
**Pass:** all 4 files exist and import from their respective source modules.  
**Fail:** any test file missing.

### VAL-TELE-211: `npm run test:frontend` passes with zero failures
Running the full frontend test suite must exit with code 0 and zero failing tests.  
**Pass:** exit code 0, all tests pass.  
**Fail:** any test fails.

### VAL-TELE-212: `npm run typecheck` passes with zero errors
TypeScript compilation must produce no errors across all teleprompter files.  
**Pass:** exit code 0.  
**Fail:** type errors present.

### VAL-TELE-213: ReadingLine test coverage includes offset boundary values
Tests must cover offset values: `0`, `0.4`, `0.5`, `1` (boundaries and midpoint).  
**Pass:** test file contains assertions for all four values.  
**Fail:** any value untested.

### VAL-TELE-214: useAutoScroll tests cover all lifecycle states
Tests must cover: not-playing (no rAF), playing (rAF scheduled), speed change (re-register), end-of-content (stop), unmount (cleanup), null ref (safety).  
**Pass:** at least 6 distinct test cases covering these scenarios.  
**Fail:** any lifecycle gap.

### VAL-TELE-215: viewportMath tests cover all presets and utilities
Tests must exercise: `clampRect` (5 edge cases), `presetRect` (at least 10 of 14 presets), `defaultRect` (3 scenarios), `applyMoveDelta` (3 cases), `applyResizeDelta` (3 cases).  
**Pass:** ≥24 test assertions across all utility functions.  
**Fail:** any function untested.

### VAL-TELE-216: TeleprompterView tests cover mode transitions
Tests must verify: edit mode on → controls visible, edit mode off → controls hidden, exit → mode reset, play/pause toggle, hidden → opacity.  
**Pass:** at least 5 mode-transition test cases.  
**Fail:** any transition untested.

### VAL-TELE-217: TeleprompterView tests cover native window integration
Tests must verify: drag handle → `startDragging()`, resize grip → `startResizeDragging('SouthEast')`, move event → settings sync, resize event → settings sync, event coalescing.  
**Pass:** at least 5 native integration test cases.  
**Fail:** any integration untested.

### VAL-TELE-218: TeleprompterView tests cover snap presets
Tests must verify: popover open/close, at least 2 preset selections (e.g., Full screen, Top right) with rect + IPC validation.  
**Pass:** at least 3 snap-related test cases.  
**Fail:** snap behavior untested.

### VAL-TELE-219: TeleprompterView tests cover hotkey integration
Tests must verify: at least 2 hotkey events (`line-down`, `jump-start`) trigger correct scroll + pause behavior.  
**Pass:** at least 2 hotkey test cases.  
**Fail:** hotkey handlers untested.

### VAL-TELE-220: Mirror transform applies correctly
With `mirrorHorizontal: true`, the scrollable container must have `transform` containing `scaleX(-1)`. With `mirrorVertical: true`, `scaleY(-1)`. With both false, no transform.  
**Pass:** transform string matches expected for each combination.  
**Fail:** wrong or missing transform.
