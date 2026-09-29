import { slugify } from '../lib/id';
import { isAncestorOrSelf } from './tree';
import { VOID_TAGS, type ComponentDoc, type ExpState, type StyleMap, type Transition } from './types';

export const PSEUDO_KINDS = new Set(['hover', 'active', 'focus', 'focus-visible']);

export function transitionValue(t: Transition): string {
  const parts = [t.property || 'all', `${t.duration}ms`, t.easing];
  if (t.delay) parts.push(`${t.delay}ms`);
  return parts.join(' ');
}

function declarations(map: StyleMap, indent = '  '): string {
  return Object.entries(map)
    .filter(([, v]) => v !== '')
    .map(([k, v]) => `${indent}${k}: ${v};`)
    .join('\n');
}

/** Nodes that change in at least one non-default state. */
function animatedNodes(doc: ComponentDoc): Set<string> {
  const set = new Set<string>();
  for (const state of doc.states.slice(1)) {
    for (const [nodeId, map] of Object.entries(doc.styles[state.id] ?? {})) {
      if (Object.keys(map).length) set.add(nodeId);
    }
  }
  return set;
}

function withTransition(map: StyleMap, t: Transition, animate: boolean): StyleMap {
  if (!animate || 'transition' in map || t.duration <= 0) return map;
  return { ...map, transition: transitionValue(t) };
}

// ---------------------------------------------------------------------------
// Editor CSS: every canvas renders the same tree; `data-state` on the canvas
// forces a state, `data-state="live"` uses real pseudo-classes.
// ---------------------------------------------------------------------------

export const nodeClass = (id: string) => `n-${id}`;
export const stateClass = (state: ExpState) => `is-${slugify(state.name)}`;

function liveTrigger(state: ExpState, cls: string): string {
  if (PSEUDO_KINDS.has(state.kind)) return `${cls}:${state.kind}`;
  return `${cls}.${stateClass(state)}`;
}

export function buildEditorCss(doc: ComponentDoc): string {
  const out: string[] = [];
  const animated = animatedNodes(doc);
  const [defaultState, ...states] = doc.states;

  for (const [nodeId, map] of Object.entries(doc.styles[defaultState.id] ?? {})) {
    const decl = declarations(withTransition(map, defaultState.transition, animated.has(nodeId)));
    if (decl) out.push(`.sc-canvas .${nodeClass(nodeId)} {\n${decl}\n}`);
  }

  for (const state of states) {
    const trigger = `.${nodeClass(state.triggerId)}`;
    for (const [nodeId, map] of Object.entries(doc.styles[state.id] ?? {})) {
      const decl = declarations(withTransition(map, state.transition, true));
      if (!decl) continue;
      const target = `.${nodeClass(nodeId)}`;
      const forced = `.sc-canvas[data-state="${state.id}"] ${target}`;
      const live = liveSelector(doc, state, nodeId, trigger, target, '.sc-canvas[data-state="live"]');
      out.push(`${forced},\n${live} {\n${decl}\n}`);
    }
  }
  return out.join('\n\n');
}

function liveSelector(
  doc: ComponentDoc,
  state: ExpState,
  nodeId: string,
  trigger: string,
  target: string,
  scope: string,
): string {
  const t = liveTrigger(state, trigger);
  if (nodeId === state.triggerId) return `${scope} ${t}`.trim();
  if (isAncestorOrSelf(doc, state.triggerId, nodeId)) return `${scope} ${t} ${target}`.trim();
  // Target is outside the trigger subtree: match via :has on the scope.
  return `${scope || ':root'}:has(${t}) ${target}`;
}

// ---------------------------------------------------------------------------
// Export: clean class names from layer names, real selectors.
// ---------------------------------------------------------------------------

export function exportClassNames(doc: ComponentDoc): Record<string, string> {
  const used = new Set<string>();
  const names: Record<string, string> = {};
  const visit = (id: string) => {
    const node = doc.nodes[id];
    const base = slugify(node.name);
    let name = base;
    for (let i = 2; used.has(name); i++) name = `${base}-${i}`;
    used.add(name);
    names[id] = name;
    node.children.forEach(visit);
  };
  visit(doc.rootId);
  return names;
}

function exportTrigger(state: ExpState, cls: string): string {
  if (PSEUDO_KINDS.has(state.kind)) return `${cls}:${state.kind}`;
  if (state.kind === 'disabled') return `${cls}:is(:disabled, .is-disabled)`;
  return `${cls}.${stateClass(state)}`;
}

export function buildExportCss(doc: ComponentDoc): string {
  const names = exportClassNames(doc);
  const animated = animatedNodes(doc);
  const [defaultState, ...states] = doc.states;
  const out: string[] = [];

  const ordered = Object.keys(names);
  for (const nodeId of ordered) {
    const map = doc.styles[defaultState.id]?.[nodeId];
    if (!map) continue;
    const decl = declarations(withTransition(map, defaultState.transition, animated.has(nodeId)));
    if (decl) out.push(`.${names[nodeId]} {\n${decl}\n}`);
  }

  for (const state of states) {
    const trigger = `.${names[state.triggerId]}`;
    const t = exportTrigger(state, trigger);
    for (const nodeId of ordered) {
      const map = doc.styles[state.id]?.[nodeId];
      if (!map) continue;
      const decl = declarations(withTransition(map, state.transition, true));
      if (!decl) continue;
      const target = `.${names[nodeId]}`;
      let selector: string;
      if (nodeId === state.triggerId) selector = t;
      else if (isAncestorOrSelf(doc, state.triggerId, nodeId)) selector = `${t} ${target}`;
      else selector = `body:has(${t}) ${target}`;
      out.push(`/* ${state.name} */\n${selector} {\n${decl}\n}`);
    }
  }
  return out.join('\n\n');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function buildExportHtml(doc: ComponentDoc): string {
  const names = exportClassNames(doc);
  const render = (id: string, depth: number): string => {
    const node = doc.nodes[id];
    const pad = '  '.repeat(depth);
    const attrs = Object.entries(node.attrs ?? {})
      .filter(([, v]) => v !== '')
      .map(([k, v]) => ` ${k}="${escapeHtml(v)}"`)
      .join('');
    const open = `<${node.tag} class="${names[id]}"${attrs}>`;
    if (VOID_TAGS.has(node.tag)) return pad + open;
    if (node.html !== undefined) return `${pad}${open}${node.html}</${node.tag}>`;
    if (!node.children.length) return `${pad}${open}${escapeHtml(node.text ?? '')}</${node.tag}>`;
    const inner = node.children.map((c) => render(c, depth + 1)).join('\n');
    return `${pad}${open}\n${inner}\n${pad}</${node.tag}>`;
  };
  return render(doc.rootId, 0);
}

export function buildExportDocument(doc: ComponentDoc): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(doc.name)}</title>
<style>
/* Matches the editor canvas. */
*, *::before, *::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: ${doc.canvas.background};
  font-family: Inter, system-ui, sans-serif;
}

${buildExportCss(doc)}
</style>
</head>
<body>
${buildExportHtml(doc)}
</body>
</html>
`;
}
