# Architecture

How the GhostPrompter system works: components, relationships, data flows, invariants.

---

## System Overview

GhostPrompter is a Tauri 2 desktop teleprompter app. The architecture is split between:
- **Frontend**: React 18 SPA in a Tauri webview
- **Backend**: Rust/Tauri with platform-specific native window management

## Window Architecture

Two windows:
1. **Main window** (`main`): Editor view - decorated, resizable, 1100x720 min
2. **Overlay window** (`overlay`): Teleprompter view - frameless, always-on-top, capture-invisible, click-through. Created on demand (not at startup).

The overlay is invisible to screen capture software (OBS, Zoom, Discord) via platform APIs (Windows: `SetWindowDisplayAffinity`, macOS: `NSWindow.setSharingType`).

## Frontend Architecture

### Component Hierarchy
```
App.tsx (root - mode switching)
├── mode=editor → EditorView
│   ├── Top bar (BrandMark, FileIndicator, ToolbarButtons, SettingsBtn, GoLive)
│   ├── Workspace (MarkdownEditor + MarkdownPreview)
│   ├── Status rail (KbdHints + StatBlocks)
│   └── SettingsModal (conditional)
└── mode=teleprompter → TeleprompterView
    ├── Viewport panel (positioned, resizable)
    ├── MarkdownPreview (scrollable content)
    ├── ReadingLine
    ├── HUD (status chip, speed readout)
    ├── Controls (speed, play/pause, nav, snap, lock, exit)
    └── Drag/resize handles
```

### State Management (Zustand)
- `modeStore`: mode (editor/teleprompter), editMode, playing, hidden
- `scriptStore`: script content/path/name/dirty, file operations
- `settingsStore`: appearance/playback/hotkey settings, persisted via LazyStore (plugin-store)

### Styling
- Tailwind 4 via `@tailwindcss/vite` plugin
- Design tokens in `@theme` block of `src/index.css`: colors (gp-ink, gp-bronze palette), glass surfaces, typography (Fraunces serif, Geist sans/mono), shape radii, motion curves
- Component classes use `gp-` namespace prefix (BEM-like)
- Shared UI primitives in `src/ui/` with barrel export

### IPC Layer
- `src/lib/ipc.ts`: All Tauri invoke wrappers (command names match Rust `#[tauri::command]`)
- `src/lib/events.ts`: Event subscriptions from backend (mode-changed, hotkey://*)  
- Events target specific windows (hotkeys → overlay window only)

## Backend Architecture (Rust)

### State
- `AppState`: registered hotkey shortcuts (Mutex<Vec<String>>), live script (Mutex<Option<Script>>)

### Commands
- Script: read_script, save_script, get_live_script
- Window: enter_teleprompter_mode, exit_teleprompter_mode, set_edit_mode, set_capture_invisible, set_click_through, is_capture_invisible_supported, set_overlay_rect
- Hotkeys: register_hotkeys, unregister_hotkeys

### Key Data Flows
1. **Enter teleprompter**: Frontend calls enterTeleprompter(script, rect) → Rust creates overlay window, hides main, configures capture/click-through → emits mode-changed to overlay
2. **Exit teleprompter**: Frontend calls exitTeleprompter → Rust closes overlay, shows main → on overlay destroyed, unregisters hotkeys
3. **Hotkeys**: Frontend registers 10 global shortcuts → Rust emits hotkey://{action} events to overlay window

## Key Invariants
- IPC command names in `src/lib/ipc.ts` must match Rust `#[tauri::command]` function names
- Event names in `src/lib/events.ts` must match Rust emit calls
- Settings types in `src/types.ts` must match Rust `settings.rs` (camelCase JSON)
- All 50 Rust tests + 244+ frontend tests must pass at all times
- Backend code is read-only for this mission (no Rust modifications unless strictly necessary for sync)
