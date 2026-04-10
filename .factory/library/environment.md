# Environment

Environment variables, external dependencies, and setup notes.

**What belongs here:** Required env vars, external API keys/services, dependency quirks, platform-specific notes.
**What does NOT belong here:** Service ports/commands (use `.factory/services.yaml`).

---

## Platform
- Windows 10 (build 26200)
- Node.js + npm installed
- Rust toolchain: rustc 1.94.1, cargo 1.94.1
- 16 GB RAM, 16 logical processors

## Dependencies
- **Runtime**: react 18, react-dom 18, react-markdown 9, rehype-raw 7, remark-gfm 4, zustand 5, @tauri-apps/api 2.1, @tauri-apps/plugin-{dialog,fs,global-shortcut,store} 2.2
- **Dev**: tailwindcss 4, @tailwindcss/vite 4, vite 6, typescript 5.6, vitest 2.1, @testing-library/{react 16, jest-dom 6, user-event 14}, eslint 9, jsdom 25, @vitejs/plugin-react 4.3

## Path Alias
- `@/` -> `src/` (configured in both vite.config.ts and tsconfig.json)

## Notes
- Tailwind 4 uses `@import "tailwindcss"` and `@tailwindcss/vite` plugin (NOT the old PostCSS approach)
- Settings persistence uses `@tauri-apps/plugin-store` (LazyStore), NOT custom Rust commands
- Vitest environment is jsdom with global imports and CSS disabled
- Test mocks are in `src/test/mocks/tauri.ts` (provides mock factories for invoke, listen, dialog, store)
