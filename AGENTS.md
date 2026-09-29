# Agent instructions — Statecraft

Vite + React 19 + TypeScript (strict) + Zustand/Immer. Read `README.md` first.

## Rules

- **Model stays pure.** `src/model` and `src/lib` never import React or the store. Everything that turns a doc into CSS/HTML lives in `src/model/css.ts`; the canvases and export use the same generator so preview = export.
- **All doc changes go through `useEditor().edit(recipe, { coalesce })`.** That is what gives undo/redo, dirty tracking and autosave. Pass a `coalesce` key for continuous edits (scrubbing, typing, color picker) so they become one undo step.
- **Styles are kebab-case CSS maps per state.** `styles.default[nodeId]` is the full base; other states hold overrides only. Use `patchProp` / `readProp` (`src/lib/shorthand.ts`) when touching properties that can be shorthands (padding, margin, border, border-radius, gap).
- **Canvas CSS is scoped** by `.sc-canvas[data-state="…"]` and node classes `n-<id>`. App UI classes use `ui-*` or a component prefix and never style bare elements, so component content isn't affected.
- **UI look**: 24px controls, Inter 11/16, `input-bg` fills, black menus. Tokens are in `src/styles/tokens.css`; app-only tokens (`--accent`, etc.) are in `src/styles/global.css`.
- **File format changes** need a version bump + migration in `src/model/file-format.ts` and a test.
- One component per file, CSS co-located (`layers.css` next to `LayersPanel.tsx`).
- Add tests in `*.test.ts` next to the code for anything in `model/` or `lib/`.

## Checks

```bash
npm run typecheck && npm test && npm run build
```

