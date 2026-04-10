---
name: frontend-redesign
description: Frontend component extraction, redesign, and testing for GhostPrompter UI
---

# Frontend Redesign Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Features that involve:
- Extracting inline components into standalone modules
- Redesigning component JSX/styling with Tailwind 4
- Creating or updating component test files
- Refactoring monolithic CSS into component-level patterns
- Design token system work

## Required Skills

- **frontend-design**: Invoke this skill at the START of your session. It provides design thinking guidelines for creating distinctive, production-grade interfaces. Follow its aesthetic guidelines for all visual decisions.
- **vercel-react-best-practices**: Invoke when implementing React components to ensure optimal patterns.
- **web-design-guidelines**: Invoke when making layout/accessibility decisions.
- **tauri-v2**: Invoke when working with any Tauri IPC, window management, or plugin interactions.

## Work Procedure

### 1. Understand the Feature
- Read the feature description, preconditions, expectedBehavior, and verificationSteps
- Read `AGENTS.md` for mission boundaries and coding conventions
- Read `.factory/library/architecture.md` for system context
- Read the existing source files you'll be modifying
- Read existing test files to understand current test patterns

### 2. Plan the Changes
- Identify what components need to be extracted/created
- Identify what test files need to be created/updated
- Identify what CSS needs to move or change
- List all files you'll touch

### 3. Write Tests First (RED)
- Create or update `.test.tsx` files for each component
- Write tests that assert the expected behavior from the feature spec
- Tests should cover: rendering, props, interactions, edge cases, accessibility
- Run `npm run test:frontend` to confirm tests fail (red phase)
- Follow existing test patterns in the codebase (see `src/test/setup.ts` and `src/test/mocks/tauri.ts`)

### 4. Implement (GREEN)
- Extract/create components with proper TypeScript interfaces
- Apply Tailwind 4 utility classes and design token CSS classes (`gp-*` namespace)
- Keep the dark+bronze aesthetic: deep ink backgrounds, bronze/copper/amber accents, Fraunces serif for display, Geist for UI text
- Use glass surface tokens (`gp-glass-*`) for panels and controls
- Ensure components use design tokens via CSS custom properties, never hardcoded colors
- Export components and their prop types
- Update barrel exports in `src/ui/index.ts` as needed
- Run `npm run test:frontend` to confirm tests pass (green phase)

### 5. Refine & Polish
- Run `npm run typecheck` and fix any type errors
- Run `npm run lint` and fix any lint errors
- Verify no existing tests broke: `npm run test:frontend` should show 244+ tests passing
- Review your code for design quality: spacing, typography, color usage, motion

### 6. Manual Verification
- Review the component tree to ensure clean module boundaries
- Check that imports use `@/ui` barrel or `@/ui/ComponentName` paths
- Verify no inline component definitions remain in view files (for extraction features)
- Check that all interactive elements are semantic `<button>` elements with accessible names

## Example Handoff

```json
{
  "salientSummary": "Extracted BrandMark, KbdHint, ToolbarButton, PanelHeader from inline definitions in EditorView.tsx into standalone components under src/ui/. Each has proper TypeScript prop interfaces, comprehensive tests, and uses design tokens exclusively. All 258 tests pass, typecheck and lint clean.",
  "whatWasImplemented": "Created src/ui/BrandMark.tsx (ghost icon SVG + wordmark + tagline, aria-hidden), src/ui/KbdHint.tsx (kbd badges + label, TypeScript-enforced keys[] and label props), src/ui/ToolbarButton.tsx (ghost-style button with gp-btn classes), src/ui/PanelHeader.tsx (numeral + rule + label + meta, decorative elements aria-hidden). Updated src/ui/index.ts barrel export. Refactored EditorView.tsx to import from @/ui instead of inline definitions. Created 4 test files with 28 test cases total.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "npm run test:frontend", "exitCode": 0, "observation": "258 tests pass (14 new + 244 existing), all green" },
      { "command": "npm run typecheck", "exitCode": 0, "observation": "No type errors" },
      { "command": "npm run lint", "exitCode": 0, "observation": "No lint errors" }
    ],
    "interactiveChecks": [
      { "action": "Verified BrandMark.tsx exports BrandMark and BrandMarkProps", "observed": "Named exports present, no default export" },
      { "action": "Verified EditorView.tsx imports from @/ui barrel", "observed": "import { BrandMark, KbdHint, ToolbarButton, PanelHeader } from '@/ui'" },
      { "action": "Checked for hardcoded colors in new components", "observed": "Zero hex/rgba values found, all using var(--color-gp-*) tokens" }
    ]
  },
  "tests": {
    "added": [
      { "file": "src/ui/BrandMark.test.tsx", "cases": [
        { "name": "renders SVG icon", "verifies": "SVG element present in output" },
        { "name": "has aria-hidden on container", "verifies": "Decorative element hidden from a11y tree" },
        { "name": "is importable from barrel", "verifies": "@/ui barrel export works" }
      ]},
      { "file": "src/ui/KbdHint.test.tsx", "cases": [
        { "name": "renders kbd badges for each key", "verifies": "Correct number of <kbd> elements" },
        { "name": "renders label text", "verifies": "Label visible next to badges" }
      ]}
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Feature requires changes to Rust backend code
- Design tokens need to be fundamentally restructured (not just extended)
- Circular dependency discovered between modules
- Existing tests fail for reasons unrelated to your changes
- Feature scope is unclear or contradictory
