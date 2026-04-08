# GhostPrompter — agent notes

## Rules (non-negotiable)

1. **TDD / green gate** — Tests define correctness. **Do not merge or treat work as done until `npm test` is green** (runs **Vitest** + **`cargo test`** in `src-tauri`). Add or update tests with behavior changes; fix failures before finishing. Rust toolchain on `PATH` required for the full gate.
2. **Understand before editing** — Trace data flow (Zustand → `ipc` → Rust commands → platform), read callers and tests, then change code. No drive-by edits.
3. **Production ready CODE** - You are not allowed to write code that would leave implementations partially done or incorrectly. End to end, fully, always. Your code must be above flawless and follow the best of guidelines.

## What this is

Desktop **teleprompter** for creators (OBS/capture-friendly): **markdown editor** ↔ **fullscreen-style teleprompter** with auto-scroll, reading line, mirroring, global hotkeys, and **capture invisibility** / click-through (platform code in `src-tauri/src/platform/`).

## Stack

| Layer | Tech |
|-------|------|
| UI | React 18, Tailwind 4 (`@tailwindcss/vite`), Vite 6 |
| State | Zustand (`modeStore`, `scriptStore`, `settingsStore`) |
| Desktop | Tauri 2, Rust |
| Tauri plugins | `dialog`, `fs`, `store` (persisted settings), `global-shortcut` |
| Tests | **FE:** Vitest + Testing Library, `src/**/*.test.{ts,tsx}` · **BE:** `cargo test`, `#[cfg(test)]` next to `src-tauri/src/**/*.rs` |

## Layout (where to look)

- **`src/App.tsx`** — Mode/hotkey wiring, listens to backend `mode-changed` and hotkey events.
- **`src/lib/ipc.ts`** — Single place for `invoke` command names (must match Rust `#[tauri::command]` names).
- **`src/lib/events.ts`** — Tauri event subscriptions from Rust → UI.
- **`src/editor/`** — Markdown edit + preview.
- **`src/teleprompter/`** — Scroll, reading line, display.
- **`src/settings/`** — Settings UI + hotkey recorder.
- **`src-tauri/src/commands/`** — `script`, `window_mode`, `hotkeys`.
- **`src-tauri/src/platform/`** — OS-specific window/capture behavior (Windows + macOS modules).

## Backend (Rust / Tauri)

**Entry:** `src-tauri/src/main.rs` calls `ghostprompter_lib::run()`. Release Windows builds use `#![windows_subsystem = "windows"]` (no extra console). `build.rs` runs `tauri_build::build()`.

**`lib.rs`:** `tauri::Builder` loads plugins: `dialog`, `fs`, `store`, `global-shortcut`. Registers managed **`AppState`** (`state.rs`). **`invoke_handler!`:** `read_script`, `save_script`, `enter_teleprompter_mode`, `exit_teleprompter_mode`, `set_edit_mode`, `set_capture_invisible`, `set_click_through`, `is_capture_invisible_supported`, `register_hotkeys`, `unregister_hotkeys`.

**`error.rs`:** `Error` = `Io` | `Tauri` | `Other(String)`. Implements `Serialize` as the **display string** so failed `invoke` payloads match `to_string()`. `Result<T>` alias used by all commands.

**`state.rs`:** `registered_hotkey_shortcuts: Mutex<Vec<String>>` — string form of each registered combo, used by **`unregister_hotkeys`** to unregister with the global-shortcut plugin. `parking_lot::Mutex`.

**`settings.rs`:** Rust **`Hotkeys`** struct only (`serde(rename_all = "camelCase")`, `Default` matches the same defaults as `src/types.ts`). Used for command args / JSON contract tests; **app settings persistence** is still the frontend `plugin-store` (`settings.json`), not this file.

**`commands/script.rs`:** `Script { path, name, content, dirty }` (camelCase JSON). **`read_script`**: read file → `display_name` from path. **`save_script`**: `create_dir_all` parent, `write` file. No watcher.

**`commands/window_mode.rs`:** Targets webview **`main`** only. **`enter_teleprompter_mode`**: no decorations, always-on-top, skip taskbar, ignore cursor events, **`platform::set_capture_hidden(true)`**, emit **`mode-changed`** `{ mode: "teleprompter", edit: false }`. **`exit_teleprompter_mode`**: reverses capture + cursor + taskbar + top + decorations, emit **`editor`**. **`set_edit_mode`**: `set_ignore_cursor_events(!edit)`, emit **`teleprompter`** with `edit`. **`set_capture_invisible`** / **`set_click_through`**: platform capture vs cursor-only. **`is_capture_invisible_supported`**: delegates to **`platform::is_capture_hiding_supported()`**.

**`commands/hotkeys.rs`:** **`register_hotkeys`**: calls **`unregister_hotkeys`** first, then registers 10 pairs `(Hotkeys field → action id)` with global-shortcut; on failure per combo, **`log::warn`** and continue. Emits events **`hotkey://{action}`** (e.g. `hotkey://play-pause`). **`unregister_hotkeys`**: drain `AppState` list, unregister each. Pure helpers tested: **`parse_shortcut`**, **`action_event`**.

**`platform/`:** **Windows (`windows.rs`):** `SetWindowDisplayAffinity` with `WDA_EXCLUDEFROMCAPTURE` vs `WDA_NONE` via `HWND`. **macOS (`macos.rs`):** `NSWindow` sharing type **None** vs **ReadOnly** via objc2. **Other OS:** no-op capture, `is_capture_hiding_supported` → `false`.

## Commands (from repo root)

- `npm test` — **gate:** `test:frontend` + `test:rust` (both must pass).
- `npm run test:frontend` / `npm run test:watch` — Vitest only.
- `npm run test:rust` — Rust unit tests only (`src-tauri`).
- `npm run typecheck` / `npm run lint` — TS + ESLint.
- `npm run tauri:dev` — app with hot reload.

## Conventions

- Path alias: `@/` → `src/`.
- Types for script/settings/hotkeys: `src/types.ts`.
- **Backend ↔ frontend:** `#[tauri::command]` names ↔ `src/lib/ipc.ts`; emitted events **`mode-changed`** / **`hotkey://…`** ↔ `src/lib/events.ts`.
- Frontend mocks for Tauri in tests: `src/test/mocks/tauri.ts`, `src/test/setup.ts`.

## Work

When working on this codebase, use skills available in here: D:\coding\somewhat\.agents\skills

- Frontend skill for frontend design
- Tauri-v2 to not make mistake with tauri
- React best practices by vercel
- Web desgin guidelines

Find that each is good for something, retrieve as needed.