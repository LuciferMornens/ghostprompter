# Milestone 2 — Editor View Redesign: Validation Contract

All assertions are verified via **Vitest + React Testing Library** (`npm run test:frontend`).
Pass criteria include `npm run typecheck` green alongside all test assertions passing.

---

## 1. EditorView Composition

### VAL-EDIT-001: EditorView renders top bar (header)
Rendering `<EditorView />` produces a `<header>` element containing the brand mark, file indicator, toolbar buttons, and Go Live CTA.

**Pass:** `container.querySelector('header')` is non-null and contains child elements for brand, file crest, and button group.
**Fail:** Header element is missing or empty.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-002: EditorView renders dual-panel workspace
Rendering `<EditorView />` produces a `<main>` element with two `<section>` children — one for the Script editor panel and one for the Preview panel.

**Pass:** `container.querySelector('main')` is non-null and `container.querySelectorAll('main > section').length >= 2`.
**Fail:** Main workspace element or either section panel is missing.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-003: EditorView renders status rail (footer)
Rendering `<EditorView />` produces a `<footer>` element containing stat blocks and keyboard hint clusters.

**Pass:** `container.querySelector('footer')` is non-null and contains children with stat labels ("Words", "Chars", "Read time") and keyboard hint elements (`<kbd>`).
**Fail:** Footer element is missing or stat/hint content is absent.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-004: All three sections co-exist in a single render
A single `render(<EditorView />)` produces `<header>`, `<main>`, and `<footer>` simultaneously.

**Pass:** All three selectors return non-null elements in one render pass.
**Fail:** Any of the three structural elements is missing.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

---

## 2. Top Bar Components

### VAL-EDIT-010: BrandMark renders ghost SVG and wordmark
The header contains the GhostPrompter brand: an SVG element (the ghost icon) and text including "Ghostprompter" (case-insensitive) along with the tagline "a quiet teleprompter".

**Pass:** `header.textContent` (lowercased) contains "ghostprompter" and "a quiet teleprompter". An `<svg>` is present within the header.
**Fail:** Brand mark text or SVG icon is missing from the header.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-011: File indicator shows script name
When `scriptStore` has `script.name = "Untitled.md"`, the header renders text "Untitled.md".

**Pass:** `screen.getByText('Untitled.md')` resolves.
**Fail:** Script name is not visible in the rendered output.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-012: File indicator shows dirty dot when unsaved
When `script.dirty = true`, the file crest area has `aria-label` containing "unsaved changes" and the dirty CSS class `gp-filecrest__dot--dirty` is applied.

**Pass:** `screen.getByLabelText(/unsaved changes/)` resolves and the dot element has the dirty class.
**Fail:** Dirty indicator is missing or aria-label is incorrect.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-013: File indicator shows "Saved" badge when clean
When `script.dirty = false`, the file crest state element displays "Saved".

**Pass:** `screen.getByText('Saved')` resolves.
**Fail:** Saved badge text is not present.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-014: File indicator shows "Draft" badge when dirty
When `script.dirty = true`, the file crest state element displays "Draft".

**Pass:** `screen.getByText('Draft')` resolves.
**Fail:** Draft badge text is not present when script is dirty.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-015: File action buttons (New, Open, Save, Save As) are all present
Rendering `<EditorView />` produces four buttons with accessible names: "New", "Open", "Save", "Save As".

**Pass:** `screen.getByRole('button', { name })` resolves for each of the four labels.
**Fail:** Any file action button is missing.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-016: Settings button is present
Rendering `<EditorView />` produces a button with accessible name "Settings".

**Pass:** `screen.getByRole('button', { name: 'Settings' })` resolves.
**Fail:** Settings button is missing.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-017: Go Live CTA button is present with aria-label
Rendering `<EditorView />` produces a button with `aria-label="Go Live"` and visible text containing "Go Live".

**Pass:** `screen.getByRole('button', { name: /go live/i })` resolves and visible text includes "Go".
**Fail:** Go Live button is missing or has incorrect labeling.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

---

## 3. File Operations

### VAL-EDIT-020: Clicking "New" resets script to default welcome content
After populating scriptStore with custom content, clicking the "New" button resets `script.path` to `null`, `script.name` to `"Untitled.md"`, `script.dirty` to `false`, and `script.content` to a non-empty default.

**Pass:** After click, `useScriptStore.getState().script` matches: `path === null`, `name === 'Untitled.md'`, `dirty === false`, `content.length > 0`, content differs from previous.
**Fail:** Any field retains the old value or content is empty.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-021: Clicking "Open" triggers openFromDisk (file dialog + IPC readScript)
Clicking "Open" calls `useScriptStore.getState().openFromDisk`, which under the hood invokes the Tauri `open` dialog and, upon selection, calls `invoke('read_script', { path })`. The IPC mock captures these calls.

**Pass:** After clicking "Open", the `openFromDisk` store action is invoked. In integration: `invoke` is called with `'read_script'` when a file is selected.
**Fail:** Store action is not called, or IPC invoke is not triggered for `read_script`.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-022: Clicking "Save" triggers saveToDisk (IPC saveScript)
Clicking "Save" calls `useScriptStore.getState().saveToDisk`. When `script.path` is set, this invokes `invoke('save_script', { path, content })`.

**Pass:** After clicking "Save" with a script that has a path, `invoke` is called with `'save_script'` and the matching path/content.
**Fail:** IPC invoke for `save_script` is not triggered.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-023: Clicking "Save As" triggers saveAs (file dialog + IPC saveScript)
Clicking "Save As" calls `useScriptStore.getState().saveAs`, which opens the Tauri `save` dialog and then calls `invoke('save_script', { path, content })` with the chosen path.

**Pass:** After clicking "Save As", the `saveAs` store action is invoked.
**Fail:** Store action is not called.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

---

## 4. Dual-Panel Layout

### VAL-EDIT-030: Script panel renders with panel header "01 — Script"
The first `<section>` within `<main>` contains a PanelHeader with numeral "01" and label "Script".

**Pass:** `screen.getByText('01')` and `screen.getByText('Script')` both resolve within the first section panel.
**Fail:** Panel header numeral or label is missing.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-031: Script panel renders subtitle "draft · markdown"
The Script panel header contains meta text "draft · markdown" (case-insensitive).

**Pass:** `screen.getByText(/draft.*markdown/i)` resolves.
**Fail:** Subtitle text is missing from the editor panel.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-032: Preview panel renders with panel header "02 — Preview"
The second `<section>` within `<main>` contains a PanelHeader with numeral "02" and label "Preview".

**Pass:** `screen.getByText('02')` and `screen.getByText('Preview')` both resolve within the second section panel.
**Fail:** Panel header numeral or label is missing.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-033: Preview panel renders subtitle "live render"
The Preview panel header contains meta text "live render" (case-insensitive).

**Pass:** `screen.getByText(/live render/i)` resolves.
**Fail:** Subtitle text is missing from the preview panel.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-034: Both panels are siblings within the main workspace
Both `<section>` elements are direct children of the `<main>` element.

**Pass:** `container.querySelectorAll('main > section').length === 2`.
**Fail:** Panels are not sibling sections or count is wrong.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

---

## 5. MarkdownEditor

### VAL-EDIT-040: MarkdownEditor renders a `<textarea>` with role="textbox"
Rendering `<MarkdownEditor />` produces a `<textarea>` element accessible via `screen.getByRole('textbox')` with `tagName === 'TEXTAREA'`.

**Pass:** The textarea element is found and is a real `<textarea>`.
**Fail:** No textarea or element is a different input type.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-041: MarkdownEditor displays current scriptStore content
When scriptStore content is "Initial content", the textarea value is "Initial content".

**Pass:** `(screen.getByRole('textbox') as HTMLTextAreaElement).value === 'Initial content'`.
**Fail:** Textarea value does not match store content.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-042: MarkdownEditor has a placeholder mentioning markdown
The textarea has a non-empty `placeholder` attribute whose text (lowercased) contains "markdown".

**Pass:** `ta.placeholder.length > 0 && ta.placeholder.toLowerCase().includes('markdown')`.
**Fail:** Placeholder is empty or does not mention markdown.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-043: Typing in MarkdownEditor updates scriptStore content
Starting with empty content, using `userEvent.type(textarea, 'abc')` results in `useScriptStore.getState().script.content === 'abc'`.

**Pass:** Store content reflects typed text.
**Fail:** Store content does not update or differs from typed input.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-044: MarkdownEditor spellCheck is enabled
The textarea has `spellCheck` attribute set (not false).

**Pass:** `textarea.spellcheck === true` or attribute `spellcheck` is present and not `"false"`.
**Fail:** Spellcheck is disabled.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

---

## 6. MarkdownPreview

### VAL-EDIT-050: MarkdownPreview renders plain text
Rendering `<MarkdownPreview content="Hello world" />` makes "Hello world" visible via `screen.getByText`.

**Pass:** Text is found in the rendered output.
**Fail:** Text is not rendered.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-051: MarkdownPreview renders headings (# → h1)
Rendering `<MarkdownPreview content="# Heading" />` produces an `<h1>` with text "Heading".

**Pass:** `screen.getByRole('heading', { level: 1 })` has text content "Heading".
**Fail:** Heading is not rendered at the correct level.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-052: MarkdownPreview renders bold (** → strong)
Rendering `<MarkdownPreview content="**bold**" />` produces a `<strong>` element with text "bold".

**Pass:** `container.querySelector('strong')` is non-null with text "bold".
**Fail:** Bold is not rendered as `<strong>`.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-053: MarkdownPreview renders italic (* → em)
Rendering `<MarkdownPreview content="*italic*" />` produces an `<em>` element with text "italic".

**Pass:** `container.querySelector('em')` is non-null with text "italic".
**Fail:** Italic is not rendered as `<em>`.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-054: MarkdownPreview renders unordered lists
Rendering `<MarkdownPreview content={"- a\n- b"} />` produces a `<ul>` with two `<li>` children.

**Pass:** `container.querySelector('ul')` is non-null and `li` count is 2.
**Fail:** List is not rendered or item count is wrong.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-055: MarkdownPreview renders GFM strikethrough (~~ → del)
Rendering `<MarkdownPreview content="~~strike~~" />` produces a `<del>` element via `remark-gfm`.

**Pass:** `container.querySelector('del')` is non-null with text "strike".
**Fail:** Strikethrough is not rendered.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-056: MarkdownPreview renders raw HTML via rehype-raw
Rendering `<MarkdownPreview content='<span class="raw">hi</span>' />` produces a `<span class="raw">` in the DOM.

**Pass:** `container.querySelector('span.raw')` is non-null with text "hi".
**Fail:** Raw HTML is stripped or not rendered.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-057: MarkdownPreview wrapper has class gp-prose
The root wrapper div of `<MarkdownPreview>` has class `gp-prose`.

**Pass:** `container.querySelector('.gp-prose')` is non-null.
**Fail:** Prose class is missing.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-058: MarkdownPreview accepts custom className
Rendering `<MarkdownPreview content="Hi" className="my-custom-class" />` applies both `gp-prose` and `my-custom-class`.

**Pass:** `container.querySelector('.gp-prose.my-custom-class')` is non-null.
**Fail:** Custom class is not applied.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

---

## 7. Status Rail — Keyboard Hints & Script Stats

### VAL-EDIT-060: Status rail shows "Words" stat with correct count
With script content "one two three four five" (5 words), the status rail displays label "Words" and value "5".

**Pass:** `screen.getByText('Words')` and `screen.getByText('5')` both resolve.
**Fail:** Words label or count is missing/incorrect.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-061: Status rail shows "Chars" stat
With script content "hello" (5 chars), the status rail displays label "Chars".

**Pass:** `screen.getByText('Chars')` resolves.
**Fail:** Chars label is missing.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-062: Status rail shows "Read time" stat with formatted duration
With script content of 8 words at 150 wpm, the status rail displays label "Read time" with a duration string (e.g. "0:03").

**Pass:** `screen.getByText('Read time')` resolves and its sibling value is a formatted duration string.
**Fail:** Read time label or duration is missing.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-063: Status rail stats update reactively when script content changes
Changing `scriptStore.script.content` from "one" (1 word) to "one two three" (3 words) re-renders the Words stat from "1" to "3".

**Pass:** After updating the store and re-rendering, the word count reflects the new content.
**Fail:** Stats do not update when content changes.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-064: Status rail shows keyboard hint for F7 (Play)
The footer contains a `<kbd>` element with text "F7" and an adjacent label "Play".

**Pass:** `screen.getByText('F7')` resolves within a `<kbd>` element and "Play" label is adjacent.
**Fail:** F7 keyboard hint is missing.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-065: Status rail shows keyboard hint for F6 (Edit)
The footer contains a `<kbd>` element with text "F6" and an adjacent label "Edit".

**Pass:** `screen.getByText('F6')` resolves within a `<kbd>` and "Edit" label is present.
**Fail:** F6 keyboard hint is missing.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-066: Status rail shows keyboard hint for Esc (Exit)
The footer contains a `<kbd>` element with text "Esc" and an adjacent label "Exit".

**Pass:** `screen.getByText('Esc')` resolves within a `<kbd>` and "Exit" label is present.
**Fail:** Esc keyboard hint is missing.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

---

## 8. Settings Modal

### VAL-EDIT-070: Clicking Settings button opens the SettingsModal
Clicking the "Settings" button causes `<SettingsModal>` to appear with a heading "Settings".

**Pass:** After click, `screen.getByRole('heading', { name: 'Settings' })` resolves.
**Fail:** Modal heading is not found after click.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-071: SettingsModal renders all four tab buttons
The modal has buttons: "Appearance", "Playback", "Hotkeys", "About".

**Pass:** `screen.getByRole('button', { name })` resolves for each of the four tab labels.
**Fail:** Any tab button is missing.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-072: Appearance tab is default and shows typography/color/mirror controls
On initial render, the Appearance tab content is visible showing font size range, line height range, text/background color inputs, background opacity range, and mirror checkboxes.

**Pass:** Font size label, line height label, "Text color", "Background color", "Background opacity" labels, and "Mirror horizontal" / "Mirror vertical" checkboxes are all present. At least 3 range inputs exist.
**Fail:** Any appearance control is missing on initial render.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-073: Changing font size range updates settingsStore
Moving the first range slider to value 60 sets `useSettingsStore.getState().settings.fontSize` to 60.

**Pass:** Store value matches the slider input.
**Fail:** Store value does not update.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-074: Toggling mirror horizontal checkbox updates settingsStore
Clicking the "Mirror horizontal" checkbox sets `settings.mirrorHorizontal` to `true`.

**Pass:** Store boolean flips to `true`.
**Fail:** Store value remains `false`.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-075: Switching to Playback tab shows scroll speed control
Clicking the "Playback" tab button reveals the scroll speed range and reading line controls.

**Pass:** `screen.getByText(/Scroll speed/)` resolves after tab click.
**Fail:** Playback content is not shown.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-076: Switching to Hotkeys tab shows all 10 hotkey rows
Clicking the "Hotkeys" tab button reveals rows for: Play / Pause, Slower, Faster, Hide / Show, Toggle edit mode, Line up, Line down, Jump to start, Jump to end, Stop / Exit.

**Pass:** All 10 hotkey labels are present in the DOM.
**Fail:** Any hotkey row label is missing.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-077: Reset hotkeys to defaults restores DEFAULT_HOTKEYS
After mutating a hotkey (e.g. playPause → "Q"), clicking "reset hotkeys to defaults" sets `settings.hotkeys` back to `DEFAULT_HOTKEYS`.

**Pass:** `useSettingsStore.getState().settings.hotkeys` deep-equals `DEFAULT_HOTKEYS` after reset.
**Fail:** Hotkeys are not restored.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-078: Switching to About tab shows version and capture status
Clicking the "About" tab reveals "GhostPrompter 0.1.0" and, after the `is_capture_invisible_supported` IPC resolves, shows "supported" or "not supported".

**Pass:** Version text and capture support status text are visible.
**Fail:** Version or capture status is missing.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-079: Clicking X close button dismisses the modal
Clicking the close button ("✕") calls the `onClose` callback.

**Pass:** `onClose` mock function is called.
**Fail:** `onClose` is not called.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-080: Clicking modal backdrop dismisses the modal
Clicking the backdrop overlay (outside the modal content) calls `onClose`.

**Pass:** `onClose` mock function is called on backdrop click.
**Fail:** `onClose` is not called.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-081: Clicking inside modal content does NOT dismiss
Clicking on a heading or control inside the modal does not trigger `onClose`.

**Pass:** `onClose` is NOT called after clicking modal interior.
**Fail:** `onClose` is called unexpectedly.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

---

## 9. HotkeyRecorder

### VAL-EDIT-090: HotkeyRecorder displays current value as button text
Rendering `<HotkeyRecorder value="F7" onChange={fn} />` shows a button with text "F7".

**Pass:** `screen.getByRole('button', { name: 'F7' })` resolves.
**Fail:** Button text does not match value prop.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-091: Clicking toggles recording state ("press keys...")
Clicking the recorder button changes its text to "press keys...".

**Pass:** After click, `screen.getByRole('button', { name: 'press keys...' })` resolves.
**Fail:** Recording text is not shown.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-092: Captures function key (F7)
In recording mode, pressing F7 calls `onChange('F7')`.

**Pass:** `onChange` mock is called with `'F7'`.
**Fail:** Callback is not called or argument is wrong.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-093: Captures compound shortcut (Control+Shift+S)
In recording mode, pressing S with ctrl+shift modifiers calls `onChange('Control+Shift+S')`.

**Pass:** `onChange` is called with `'Control+Shift+S'`.
**Fail:** Modifier order or key normalization is wrong.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-094: Captures plain letter as uppercase (a → A)
In recording mode, pressing "a" calls `onChange('A')`.

**Pass:** `onChange` is called with `'A'`.
**Fail:** Letter is not uppercased.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-095: Captures arrow keys with short names (ArrowUp → Up)
In recording mode, pressing ArrowUp calls `onChange('Up')`.

**Pass:** `onChange` is called with `'Up'`.
**Fail:** Arrow key is not normalized.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-096: Captures Space key as "Space"
In recording mode, pressing the space bar calls `onChange('Space')`.

**Pass:** `onChange` is called with `'Space'`.
**Fail:** Space is not normalized.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-097: Captures Escape key
In recording mode, pressing Escape calls `onChange('Escape')`.

**Pass:** `onChange` is called with `'Escape'`.
**Fail:** Escape key is not captured.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-098: Modifier-only keypress does not trigger onChange
In recording mode, pressing only Shift (no additional key) does NOT call `onChange`. Recording state continues.

**Pass:** `onChange` is not called and "press keys..." is still displayed.
**Fail:** `onChange` is called with a modifier-only combo, or recording ends.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-099: After capture, recording ends and new value is displayed
Using a controlled wrapper, after capturing F4 the button text changes from "press keys..." to "F4".

**Pass:** Button shows the newly captured value and recording state is off.
**Fail:** Button still shows "press keys..." or old value.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

---

## 10. Go Live Button — Teleprompter Mode Entry

### VAL-EDIT-100: Go Live button triggers enter_teleprompter_mode IPC
Clicking the "Go Live" button calls `invoke('enter_teleprompter_mode', ...)` with the current script and a rect object.

**Pass:** `invoke` mock is called with `'enter_teleprompter_mode'` and payload including `script` and `rect` properties.
**Fail:** IPC invoke for `enter_teleprompter_mode` is not called.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-101: Go Live registers hotkeys AFTER entering teleprompter mode
The `invoke('register_hotkeys', ...)` call occurs after `invoke('enter_teleprompter_mode', ...)` — verified by call order in the mock.

**Pass:** Index of `enter_teleprompter_mode` in invoke calls is less than index of `register_hotkeys`.
**Fail:** Hotkeys are registered before or without entering teleprompter mode.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-102: Go Live sets modeStore.playing to false after success
After successful teleprompter entry, `useModeStore.getState().playing` is `false` (paused, ready for user to start).

**Pass:** `playing === false` after Go Live completes.
**Fail:** Playing state is not set to false.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-103: Go Live shows alert and stays in editor on IPC failure
If `enter_teleprompter_mode` rejects, `window.alert` is called with an error message and `modeStore.mode` remains `"editor"`.

**Pass:** `alert` mock is called and mode is still `"editor"`.
**Fail:** Alert is not shown or mode changes despite failure.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-104: Go Live passes script payload with name and content
The `enter_teleprompter_mode` invoke includes a `script` object with at least `name` and `content` fields matching scriptStore.

**Pass:** `invoke` call's second argument contains `script: { name: 'Untitled.md', content: '# Hello' }`.
**Fail:** Script payload is missing or malformed.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

### VAL-EDIT-105: Go Live passes overlay rect with x, y, w, h
The `enter_teleprompter_mode` invoke includes a `rect` object with numeric `x`, `y`, `w`, `h` properties.

**Pass:** `rect` is an object with all four numeric fields present.
**Fail:** Rect is missing or incomplete.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output, typecheck pass

---

## 11. Component Modularity

### VAL-EDIT-110: EditorView imports MarkdownEditor as a separate module
`MarkdownEditor` is defined in `src/editor/MarkdownEditor.tsx` and imported by `EditorView.tsx` — not inlined.

**Pass:** `src/editor/MarkdownEditor.tsx` exports `MarkdownEditor` as a named export. `EditorView.tsx` contains `import { MarkdownEditor } from "./MarkdownEditor"`.
**Fail:** MarkdownEditor is defined inline within EditorView.
**Tool:** vitest (`npm run test:frontend`), typecheck, static analysis of import paths
**Evidence:** typecheck pass, grep of import statements

### VAL-EDIT-111: EditorView imports MarkdownPreview as a separate module
`MarkdownPreview` is defined in `src/editor/MarkdownPreview.tsx` and imported by `EditorView.tsx` — not inlined.

**Pass:** `src/editor/MarkdownPreview.tsx` exports `MarkdownPreview`. `EditorView.tsx` imports it.
**Fail:** MarkdownPreview is defined inline within EditorView.
**Tool:** vitest (`npm run test:frontend`), typecheck
**Evidence:** typecheck pass, grep of import statements

### VAL-EDIT-112: SettingsModal is a separate module in src/settings/
`SettingsModal` is defined in `src/settings/SettingsModal.tsx` and imported by `EditorView.tsx`.

**Pass:** File exists, exports `SettingsModal`, and is imported by EditorView.
**Fail:** SettingsModal is inlined.
**Tool:** vitest (`npm run test:frontend`), typecheck
**Evidence:** typecheck pass, grep of import statements

### VAL-EDIT-113: HotkeyRecorder is a separate module in src/settings/
`HotkeyRecorder` is defined in `src/settings/HotkeyRecorder.tsx` and used within `SettingsModal`.

**Pass:** File exists and exports `HotkeyRecorder`. SettingsModal imports and renders it.
**Fail:** HotkeyRecorder is inlined within SettingsModal.
**Tool:** vitest (`npm run test:frontend`), typecheck
**Evidence:** typecheck pass, grep of import statements

### VAL-EDIT-114: StatBlock is a separate UI module
`StatBlock` is defined in `src/ui/StatBlock.tsx` (or similar path under `src/ui/`) and imported by EditorView.

**Pass:** File exists and exports `StatBlock`. EditorView imports `{ StatBlock } from "@/ui/StatBlock"`.
**Fail:** StatBlock is inlined within EditorView.
**Tool:** vitest (`npm run test:frontend`), typecheck
**Evidence:** typecheck pass, grep of import statements

### VAL-EDIT-115: Each component has its own test file
`EditorView.test.tsx`, `MarkdownEditor.test.tsx`, `MarkdownPreview.test.tsx`, `SettingsModal.test.tsx`, and `HotkeyRecorder.test.tsx` exist and contain `describe` blocks.

**Pass:** All five test files exist and produce passing test suites.
**Fail:** Any test file is missing.
**Tool:** vitest (`npm run test:frontend`)
**Evidence:** test output listing all suites

---

## 12. Backend Sync — IPC Contracts

### VAL-EDIT-120: ipc.readScript invokes Rust command "read_script"
`ipc.readScript(path)` calls `invoke('read_script', { path })` and returns a `Script` object.

**Pass:** TypeScript compiles and the invoke call name matches the Rust `#[tauri::command]` name `read_script`.
**Fail:** Command name mismatch or type incompatibility.
**Tool:** vitest (`npm run test:frontend`), `npm run typecheck`
**Evidence:** typecheck pass, IPC mock expectations in test

### VAL-EDIT-121: ipc.saveScript invokes Rust command "save_script"
`ipc.saveScript(path, content)` calls `invoke('save_script', { path, content })` and returns a string.

**Pass:** TypeScript compiles and the invoke call name matches `save_script`.
**Fail:** Command name mismatch.
**Tool:** vitest (`npm run test:frontend`), `npm run typecheck`
**Evidence:** typecheck pass

### VAL-EDIT-122: ipc.enterTeleprompter invokes Rust command "enter_teleprompter_mode"
`ipc.enterTeleprompter(script, rect)` calls `invoke('enter_teleprompter_mode', { script, rect })` with correct argument shapes.

**Pass:** TypeScript compiles; `Script` type includes `path`, `name`, `content`, `dirty`; rect includes `x`, `y`, `w`, `h`.
**Fail:** Type mismatch or command name wrong.
**Tool:** vitest (`npm run test:frontend`), `npm run typecheck`
**Evidence:** typecheck pass, Go Live test verifies invoke payload

### VAL-EDIT-123: ipc.registerHotkeys invokes Rust command "register_hotkeys"
`ipc.registerHotkeys(hotkeys)` calls `invoke('register_hotkeys', { hotkeys })` with a `Hotkeys` object.

**Pass:** TypeScript compiles; `Hotkeys` type has all 10 action fields as strings.
**Fail:** Type mismatch or command name wrong.
**Tool:** vitest (`npm run test:frontend`), `npm run typecheck`
**Evidence:** typecheck pass, Go Live test verifies `register_hotkeys` is called

### VAL-EDIT-124: ipc.isCaptureInvisibleSupported invokes correct command
`ipc.isCaptureInvisibleSupported()` calls `invoke<boolean>('is_capture_invisible_supported')` and returns a boolean.

**Pass:** TypeScript compiles; About tab test verifies the invoke resolves and "supported" / "not supported" text appears.
**Fail:** Command name or return type mismatch.
**Tool:** vitest (`npm run test:frontend`), `npm run typecheck`
**Evidence:** typecheck pass, SettingsModal About tab test

### VAL-EDIT-125: Settings persistence uses Tauri plugin-store (not IPC commands)
Settings are loaded and saved via `@tauri-apps/plugin-store` (`LazyStore`) — not via custom Rust commands. The `settingsStore` reads/writes to the store file directly.

**Pass:** `settingsStore` imports `LazyStore` from `@tauri-apps/plugin-store` and calls `.get()` / `.set()` / `.save()` for persistence. No `invoke('save_settings')` or similar custom command exists in `ipc.ts`.
**Fail:** Settings use a custom IPC command instead of plugin-store.
**Tool:** vitest (`npm run test:frontend`), `npm run typecheck`, static analysis
**Evidence:** typecheck pass, grep of settingsStore imports

---

## Summary

| Range | Category | Count |
|-------|----------|-------|
| VAL-EDIT-001–004 | EditorView composition | 4 |
| VAL-EDIT-010–017 | Top bar components | 8 |
| VAL-EDIT-020–023 | File operations | 4 |
| VAL-EDIT-030–034 | Dual-panel layout | 5 |
| VAL-EDIT-040–044 | MarkdownEditor | 5 |
| VAL-EDIT-050–058 | MarkdownPreview | 9 |
| VAL-EDIT-060–066 | Status rail | 7 |
| VAL-EDIT-070–081 | Settings modal | 12 |
| VAL-EDIT-090–099 | HotkeyRecorder | 10 |
| VAL-EDIT-100–105 | Go Live / teleprompter | 6 |
| VAL-EDIT-110–115 | Component modularity | 6 |
| VAL-EDIT-120–125 | Backend sync (IPC) | 6 |
| **Total** | | **82** |
