/**
 * HTML → ComponentDoc.
 *
 * - Elements become layers; class names become layer names (so export keeps them).
 * - `<style>` rules and inline styles are resolved per element (by specificity, then order).
 * - Rules with :hover / :active / :focus / :focus-visible become states, triggered by
 *   the element that carries the pseudo-class.
 * - Inline <svg> is kept verbatim as a leaf. Scripts, event handlers, @media rules and
 *   pseudo-elements are dropped (and counted in the report).
 *
 * Needs a browser DOM (DOMParser, constructable CSSStyleSheet).
 */
import { uid } from '../lib/id';
import { DEFAULT_TRANSITION } from './templates';
import { DEFAULT_STATE_ID, VOID_TAGS, type ComponentDoc, type ExpNode, type StateKind, type StyleMap } from './types';

export interface ImportReport {
  elements: number;
  states: number;
  skipped: { media: number; pseudoElements: number; unsupportedSelectors: number; scripts: number };
}

const SKIP_TAGS = new Set(['script', 'style', 'link', 'meta', 'noscript', 'template', 'iframe', 'object', 'title', 'head', 'base']);

const INHERITED = /^(color|font|font-.*|line-height|letter-spacing|word-spacing|text-align|text-transform|text-rendering|white-space|direction|cursor|visibility|list-style.*|-webkit-font-smoothing|-moz-osx-font-smoothing|--.*)$/;

const STATE_PSEUDOS: { re: RegExp; kind: StateKind; label: string }[] = [
  { re: /:focus-visible\b/, kind: 'focus-visible', label: 'Focus visible' },
  { re: /:focus(?![-\w])/, kind: 'focus', label: 'Focus' },
  { re: /:hover\b/, kind: 'hover', label: 'Hover' },
  { re: /:active\b/, kind: 'active', label: 'Pressed' },
];

const BOOLEAN_ATTRS = new Set(['disabled', 'checked', 'readonly', 'required', 'multiple', 'hidden', 'selected', 'open', 'muted', 'loop', 'autoplay', 'controls']);

interface RuleHit {
  specificity: number;
  order: number;
  decls: StyleMap;
}

interface StateEntry {
  kind: StateKind;
  label: string;
  trigger: Element;
  targets: Map<Element, RuleHit[]>;
}

// ---------------------------------------------------------------------------

export function importHtml(source: string, fallbackName = 'Imported'): { doc: ComponentDoc; report: ImportReport } {
  const parsed = new DOMParser().parseFromString(source, 'text/html');
  const report: ImportReport = {
    elements: 0,
    states: 0,
    skipped: { media: 0, pseudoElements: 0, unsupportedSelectors: 0, scripts: parsed.querySelectorAll('script').length },
  };

  const base = new Map<Element, RuleHit[]>();
  // kind → trigger element → target element → hits
  const stateHits = new Map<StateKind, Map<Element, StateEntry>>();
  let order = 0;

  const push = (map: Map<Element, RuleHit[]>, el: Element, hit: RuleHit) => {
    const list = map.get(el);
    if (list) list.push(hit);
    else map.set(el, [hit]);
  };

  for (const rule of collectRules(parsed, report)) {
    for (const selector of splitSelectorList(rule.selectorText)) {
      const decls = parseDeclarations(rule.style.cssText);
      if (!Object.keys(decls).length) continue;
      if (/::|:(before|after)\b/.test(selector)) {
        report.skipped.pseudoElements++;
        continue;
      }
      const hit = { specificity: specificity(selector), order: order++, decls };
      const pseudo = STATE_PSEUDOS.find((p) => p.re.test(selector));
      if (!pseudo) {
        for (const el of safeQuery(parsed, selector, report)) push(base, el, hit);
        continue;
      }
      const split = splitAtPseudo(selector, pseudo.re);
      if (!split || STATE_PSEUDOS.some((p) => p.re.test(split.full))) {
        report.skipped.unsupportedSelectors++;
        continue;
      }
      for (const target of safeQuery(parsed, split.full, report)) {
        const trigger = target.closest(split.trigger) ?? safeQuery(parsed, split.trigger, report)[0];
        if (!trigger) continue;
        const byTrigger = stateHits.get(pseudo.kind) ?? new Map<Element, StateEntry>();
        stateHits.set(pseudo.kind, byTrigger);
        let entry = byTrigger.get(trigger);
        if (!entry) {
          entry = { kind: pseudo.kind, label: pseudo.label, trigger, targets: new Map() };
          byTrigger.set(trigger, entry);
        }
        push(entry.targets, target, hit);
      }
    }
  }

  // Inline styles win over rules.
  for (const el of parsed.querySelectorAll('[style]')) {
    const decls = parseDeclarations((el as HTMLElement).style.cssText);
    push(base, el, { specificity: 1e9, order: order++, decls });
  }

  // --- Build the tree ------------------------------------------------------
  const now = new Date().toISOString();
  const doc: ComponentDoc = {
    id: uid('doc'),
    name: parsed.title.trim() || fallbackName,
    createdAt: now,
    updatedAt: now,
    canvas: { background: '#f4f4f5' },
    rootId: '',
    nodes: {},
    states: [],
    styles: { [DEFAULT_STATE_ID]: {} },
  };
  const ids = new Map<Element, string>();

  const addNode = (partial: Omit<ExpNode, 'id' | 'children'>, el: Element | null): string => {
    const id = uid('n');
    doc.nodes[id] = { ...partial, id, children: [] };
    if (el) {
      ids.set(el, id);
      const style = resolve(base.get(el));
      if (Object.keys(style).length) doc.styles[DEFAULT_STATE_ID][id] = style;
    }
    if (partial.parentId) doc.nodes[partial.parentId].children.push(id);
    report.elements++;
    return id;
  };

  const convert = (el: Element, parentId: string | null): void => {
    const tag = el.tagName.toLowerCase();
    if (SKIP_TAGS.has(tag)) return;
    const attrs = readAttributes(el);
    const common = { name: layerName(el), tag, parentId, attrs: Object.keys(attrs).length ? attrs : undefined };

    if (tag === 'svg') {
      addNode({ ...common, html: sanitizedInnerHtml(el) }, el);
      return;
    }
    if (VOID_TAGS.has(tag)) {
      addNode(common, el);
      return;
    }
    const kids = [...el.childNodes].filter(
      (n) =>
        (n.nodeType === Node.ELEMENT_NODE && !SKIP_TAGS.has((n as Element).tagName.toLowerCase())) ||
        (n.nodeType === Node.TEXT_NODE && n.textContent!.trim()),
    );
    if (kids.every((n) => n.nodeType === Node.TEXT_NODE)) {
      addNode({ ...common, text: collapse(el.textContent ?? '').trim() || undefined }, el);
      return;
    }
    const id = addNode(common, el);
    for (const kid of kids) {
      if (kid.nodeType === Node.ELEMENT_NODE) convert(kid as Element, id);
      else addNode({ name: 'Text', tag: 'span', text: collapse(kid.textContent ?? ''), parentId: id }, null);
    }
  };

  const body = parsed.body;
  const bodyElements = [...body.children].filter((c) => !SKIP_TAGS.has(c.tagName.toLowerCase()));
  const pageStyle = resolve([...(base.get(parsed.documentElement) ?? []), ...(base.get(body) ?? [])]);

  if (bodyElements.length === 1 && !directText(body)) {
    convert(bodyElements[0], null);
    doc.rootId = ids.get(bodyElements[0])!;
    // Only inheritable page styles (fonts, colors, custom properties) carry over.
    const inherited = Object.fromEntries(Object.entries(pageStyle).filter(([k]) => INHERITED.test(k)));
    doc.styles[DEFAULT_STATE_ID][doc.rootId] = { ...inherited, ...doc.styles[DEFAULT_STATE_ID][doc.rootId] };
  } else {
    // Several top-level elements: the body becomes a wrapper layer.
    const pageLayout = Object.fromEntries(
      Object.entries(pageStyle).filter(([k]) => !/^(margin.*|height|min-height|background.*)$/.test(k)),
    );
    doc.rootId = addNode({ name: 'Page', tag: 'div', parentId: null }, null);
    doc.styles[DEFAULT_STATE_ID][doc.rootId] = pageLayout;
    ids.set(body, doc.rootId);
    for (const kid of [...body.childNodes]) {
      if (kid.nodeType === Node.ELEMENT_NODE) convert(kid as Element, doc.rootId);
      else if (kid.nodeType === Node.TEXT_NODE && kid.textContent!.trim())
        addNode({ name: 'Text', tag: 'span', text: collapse(kid.textContent!), parentId: doc.rootId }, null);
    }
  }
  const bg = pageStyle['background-color'] ?? pageStyle.background;
  if (bg && !/url\(|gradient/.test(bg)) doc.canvas.background = bg;

  // --- States --------------------------------------------------------------
  // Imported CSS carries its own `transition` declarations, so auto-transitions are off (0ms).
  const noTransition = { ...DEFAULT_TRANSITION, duration: 0 };
  doc.states.push({ id: DEFAULT_STATE_ID, name: 'Default', kind: 'default', triggerId: doc.rootId, transition: noTransition });

  const entries = [...stateHits.values()].flatMap((byTrigger) => [...byTrigger.values()]);
  for (const entry of entries) {
    const triggerId = ids.get(entry.trigger) ?? doc.rootId;
    const styles: Record<string, StyleMap> = {};
    for (const [el, hits] of entry.targets) {
      const nodeId = ids.get(el);
      if (nodeId) styles[nodeId] = { ...styles[nodeId], ...resolve(hits) };
    }
    if (!Object.keys(styles).length) continue;
    const id = uid('s');
    const sameKind = stateHits.get(entry.kind)!.size > 1;
    const name = sameKind ? `${entry.label} · ${doc.nodes[triggerId].name}` : entry.label;
    doc.states.push({ id, name, kind: entry.kind, triggerId, transition: { ...noTransition } });
    doc.styles[id] = styles;
    report.states++;
  }

  return { doc, report };
}

// ---------------------------------------------------------------------------

function collectRules(parsed: Document, report: ImportReport): CSSStyleRule[] {
  const rules: CSSStyleRule[] = [];
  for (const styleEl of parsed.querySelectorAll('style')) {
    const sheet = new CSSStyleSheet();
    try {
      sheet.replaceSync(styleEl.textContent ?? '');
    } catch {
      continue;
    }
    for (const rule of sheet.cssRules) {
      if (rule instanceof CSSStyleRule) rules.push(rule);
      else if (rule instanceof CSSMediaRule) report.skipped.media++;
    }
  }
  return rules;
}

/** "a, b:is(c, d)" → ["a", "b:is(c, d)"] */
export function splitSelectorList(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of text) {
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth--;
    if (ch === ',' && depth === 0) {
      out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** Split "padding: 4px; background: url(a;b)" safely. */
export function parseDeclarations(cssText: string): StyleMap {
  const out: StyleMap = {};
  let depth = 0;
  let quote: string | null = null;
  let cur = '';
  const flush = () => {
    const i = cur.indexOf(':');
    if (i > 0) {
      const prop = cur.slice(0, i).trim();
      const value = cur.slice(i + 1).trim();
      if (prop && value) out[prop.startsWith('--') ? prop : prop.toLowerCase()] = value;
    }
    cur = '';
  };
  for (const ch of cssText) {
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ';' && depth === 0) {
      flush();
      continue;
    }
    cur += ch;
  }
  flush();
  return compactBorder(out);
}

/**
 * The CSSOM expands `border: none` into width/style/color/image longhands.
 * Fold them back into one `border` so imported styles stay readable.
 */
function compactBorder(map: StyleMap): StyleMap {
  const width = map['border-width'];
  const style = map['border-style'];
  const color = map['border-color'];
  const image = map['border-image'];
  if (!width || !style || !color || (image && image !== 'none' && image !== 'initial')) return map;
  if ([width, style, color].some((v) => v.includes(' '))) return map; // per-side values
  const out: StyleMap = {};
  for (const [k, v] of Object.entries(map)) {
    if (k === 'border-width') {
      out.border =
        style === 'none' ? 'none' : [width !== 'medium' && width, style, color !== 'currentcolor' && color].filter(Boolean).join(' ');
    } else if (!['border-style', 'border-color', 'border-image'].includes(k)) out[k] = v;
  }
  return out;
}

/** Rough specificity: ids · classes/attributes/pseudo-classes · types. */
export function specificity(selector: string): number {
  const s = selector.replace(/:where\([^)]*\)/g, '').replace(/"[^"]*"|'[^']*'/g, '');
  const ids = (s.match(/#[\w-]+/g) ?? []).length;
  const classes = (s.match(/\.[\w-]+|\[[^\]]*\]|:(?!:)[\w-]+/g) ?? []).length;
  const types = (s.match(/(^|[\s>+~(])[a-z][\w-]*/gi) ?? []).length;
  return ids * 10000 + classes * 100 + types;
}

/**
 * ".card:hover .title" → { trigger: ".card", full: ".card .title" }.
 * The trigger is the compound selector that carried the pseudo-class.
 */
export function splitAtPseudo(selector: string, re: RegExp): { trigger: string; full: string } | null {
  const m = re.exec(selector);
  if (!m) return null;
  const before = selector.slice(0, m.index);
  if (!before || /[\s>+~]$/.test(before)) return null; // bare ":hover" — no element to attach it to
  let rest = selector.slice(m.index + m[0].length);
  // Extend to the end of the compound (stop at a top-level combinator).
  let depth = 0;
  let end = 0;
  for (; end < rest.length; end++) {
    const ch = rest[end];
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth--;
    if (depth === 0 && /[\s>+~]/.test(ch)) break;
  }
  const compoundTail = rest.slice(0, end);
  rest = rest.slice(end);
  return { trigger: (before + compoundTail).trim(), full: (before + compoundTail + rest).trim() };
}

function safeQuery(parsed: Document, selector: string, report: ImportReport): Element[] {
  try {
    return [...parsed.querySelectorAll(selector)];
  } catch {
    report.skipped.unsupportedSelectors++;
    return [];
  }
}

function resolve(hits: RuleHit[] | undefined): StyleMap {
  if (!hits?.length) return {};
  const sorted = [...hits].sort((a, b) => a.specificity - b.specificity || a.order - b.order);
  const out: StyleMap = {};
  for (const h of sorted) {
    for (const [k, v] of Object.entries(h.decls)) {
      delete out[k]; // re-insert so later declarations keep source order
      out[k] = v;
    }
  }
  return out;
}

function readAttributes(el: Element): Record<string, string> {
  const out: Record<string, string> = {};
  for (const { name, value } of el.attributes) {
    if (name === 'class' || name === 'style' || name === 'id' || name.startsWith('on')) continue;
    if ((name === 'href' || name === 'src') && /^\s*javascript:/i.test(value)) continue;
    out[name] = value === '' && BOOLEAN_ATTRS.has(name) ? name : value;
  }
  return out;
}

function sanitizedInnerHtml(el: Element): string {
  const clone = el.cloneNode(true) as Element;
  clone.querySelectorAll('script, foreignObject').forEach((n) => n.remove());
  for (const node of [clone, ...clone.querySelectorAll('*')]) {
    for (const attr of [...node.attributes]) {
      if (attr.name.startsWith('on') || /^\s*javascript:/i.test(attr.value)) node.removeAttribute(attr.name);
    }
  }
  return clone.innerHTML.trim();
}

function layerName(el: Element): string {
  const cls = el.classList[0];
  if (cls) return cls;
  if (el.id) return el.id;
  const tag = el.tagName.toLowerCase();
  return tag.charAt(0).toUpperCase() + tag.slice(1);
}

const collapse = (s: string) => s.replace(/\s+/g, ' ');

function directText(el: Element): boolean {
  return [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim());
}
