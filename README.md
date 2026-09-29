# Statecraft

A local-first editor for designing interactive UI component states — hover, pressed, focus, custom — with live CSS transitions and clean HTML/CSS export.

```
┌ Top bar: File · Select element (V) · name · undo/redo · Code · Save ─────────────┐
├ Layers ──────┬ Default │ Hover │ Pressed │ + Add state ──────┬ Inspector ─────────┤
│ tree, drag,  │  (each canvas is forced into one state)        │ State + transition │
│ right-click  ├────────────────────────────────────────────────┤ Element            │
│ menu         │  Preview (real :hover / :active / :focus)      │ Layout, Size, …    │
│              │                                                │ Raw CSS            │
└──────────────┴────────────────────────────────────────────────┴────────────────────┘
```

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (calc, shorthands, tree ops, CSS export, file format)
npm run build      # typecheck + production build in dist/
```

## Features

- **Components** — New from template (Blank, Button, Card, Input, Toggle), import an HTML file, Open / Save / Save as a local `.statecraft` file. Uses the File System Access API in Chromium browsers (Save writes back to the same file); other browsers download/upload. The working copy is autosaved to localStorage for crash recovery.
- **States** — Default + any number of states. Kinds: `:hover`, `:active`, `:focus`, `:focus-visible`, disabled, and custom classes (e.g. `.is-on`). Each state has a trigger element and its own transition (duration, delay, easing, properties). Non-default states store overrides only.
- **Canvases** — one canvas per state, forced into that state, plus an interactive Preview below. Custom states toggle from the preview header or by clicking their trigger.
- **Select element** (`V`) — inspect-style picking in any canvas. Hover highlights, click selects; right-click opens the layer menu.
- **Inspector** — Layout, Size, Spacing, Typography, Fill, Border, Effects, Position, plus a raw CSS list for any property. Overridden values are marked blue and can be reset per property.
- **Value inputs** — units menu (px, %, em, rem, vh, vw, auto…), math (`100/2` → `50px`, `100% - 24px` → `calc(100% - 24px)`), ↑/↓ nudge (Shift ×10, Alt ×0.1), drag the icon to scrub.
- **Layers** — tree with drag-and-drop reorder/reparent, inline rename, and a context menu: Wrap in div, Unwrap, Add child, Duplicate, Move up/down, Delete.
- **Import HTML** — elements become layers (class names become layer names), `<style>` and inline styles are resolved per element, and `:hover` / `:active` / `:focus` rules become states. Inline SVG is kept; scripts, event handlers, `@media` rules and `::before/::after` are skipped.
- **Code** — HTML, CSS, or a full page; copy or download.

## Shortcuts

| Keys | Action |
|---|---|
| `V` | Toggle select element |
| `⌘S` / `⇧⌘S` | Save / Save as |
| `⌘O` | Open |
| `⇧⌘O` | Import HTML |
| `⌥N` | New component |
| `⌘E` | View code |
| `⌘Z` / `⇧⌘Z` | Undo / Redo |
| `⌘D` | Duplicate |
| `⌥⌘G` / `⇧⌘G` | Wrap in div / Unwrap |
| `⌘[` / `⌘]` | Move up / down |
| `↑` / `↓` | Previous / next layer |
| `Enter` / `⇧Enter` | Select first child / parent |
| `F2` | Rename |
| `⌫` | Delete |

## The `.statecraft` format

JSON with a versioned envelope:

```jsonc
{
  "format": "statecraft",
  "version": 1,
  "savedAt": "2026-09-29T08:00:00.000Z",
  "document": {
    "id": "doc_…", "name": "Button",
    "canvas": { "background": "#f4f4f5" },
    "rootId": "n_…",
    "nodes":  { "n_…": { "id", "name", "tag", "text?", "attrs?", "parentId", "children": [] } },
    "states": [{ "id": "default", "kind": "default", "triggerId", "transition": {…} }, …],
    "styles": { "<stateId>": { "<nodeId>": { "padding-top": "12px" } } }
  }
}
```

`states[0]` is always `default`. Uploaded images are embedded as data URLs. Bump `FORMAT_VERSION` and add a step in `migrate()` (`src/model/file-format.ts`) when the shape changes.

## Code layout

```
src/
  model/         Pure data: types, templates, tree ops, CSS/HTML generation, file format
  lib/           Framework-free helpers: calc (math in inputs), shorthand, color, fs, id
  store/         Zustand editor store (doc, undo/redo, selection) + file actions/autosave
  hooks/         Keyboard shortcuts
  components/
    ui/          Design-system primitives: ValueInput, Select, ColorInput, Menu, Icon…
    topbar/      File menu, select tool, name, undo/redo, save
    layers/      Layers tree + shared node context menu
    canvas/      Workspace, state canvases, selection overlay
    inspector/   Control panel sections
    dialogs/     New component, Code, Confirm
  styles/        Design tokens, global styles, app layout
```

See [AGENTS.md](./AGENTS.md) for conventions.

## Origin

Statecraft grew out of [Experiment Tool](https://github.com/vickyfikri90-cloud/experiment-tool), a vanilla-JS kit for one-off UI experiments. Its control-panel look (tokens in `src/styles/tokens.css`) comes from that project's design system.
