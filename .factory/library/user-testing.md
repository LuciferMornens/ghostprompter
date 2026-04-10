# User Testing

Testing surface, required testing skills/tools, resource cost classification per surface.

---

## Validation Surface

This is a Tauri desktop app. The primary testing surface is:
- **Vitest + React Testing Library (jsdom)**: Component rendering, interaction, state management
- **npm run typecheck**: TypeScript type safety
- **npm run lint**: ESLint code quality
- **npm run test:rust**: Cargo test for backend

There is NO browser-based testing surface. The app cannot be tested via agent-browser (it's a native Tauri window, not accessible via HTTP URL).

## Validation Concurrency

**Surface: vitest**
- Max concurrent validators: 3
- Rationale: 16 GB total RAM, ~5 GB available at baseline. Each Vitest process consumes ~300-500 MB. 3 concurrent = ~1.5 GB well within budget. CPU is 16 cores, so parallelism is not CPU-bound.

## Testing Notes
- Test mocks for Tauri are in `src/test/mocks/tauri.ts`
- Vitest setup file: `src/test/setup.ts` (provides jest-dom, TAURI_INTERNALS mock, matchMedia)
- CSS is disabled in Vitest (jsdom doesn't render CSS). Style assertions check inline styles and class names, not computed styles.
- Tests use `@testing-library/user-event` for interaction simulation
