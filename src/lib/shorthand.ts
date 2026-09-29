/**
 * Shorthand ↔ longhand helpers so the inspector can edit `padding-top`
 * even when the stored style uses `padding: 8px 16px`.
 */
import type { StyleMap } from '../model/types';

const SIDES = ['top', 'right', 'bottom', 'left'] as const;
const CORNERS = ['top-left', 'top-right', 'bottom-right', 'bottom-left'] as const;

export const SHORTHANDS: Record<string, string[]> = {
  padding: SIDES.map((s) => `padding-${s}`),
  margin: SIDES.map((s) => `margin-${s}`),
  inset: SIDES.map((s) => s),
  'border-radius': CORNERS.map((c) => `border-${c}-radius`),
  'border-width': SIDES.map((s) => `border-${s}-width`),
  border: ['border-width', 'border-style', 'border-color'],
  gap: ['row-gap', 'column-gap'],
};

const LONGHAND_TO_SHORTHAND: Record<string, string> = {};
for (const [short, longs] of Object.entries(SHORTHANDS)) {
  for (const l of longs) LONGHAND_TO_SHORTHAND[l] ??= short;
}

/** Split on whitespace outside parentheses: "1px solid rgba(0, 0, 0, .1)" → 3 parts. */
export function splitValue(value: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of value.trim()) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (/\s/.test(ch) && depth === 0) {
      if (cur) out.push(cur);
      cur = '';
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

const BORDER_STYLES = new Set(['none', 'hidden', 'dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset']);

export function expand(short: string, value: string): StyleMap {
  const longs = SHORTHANDS[short];
  if (short === 'border') {
    const parts = splitValue(value);
    const out: StyleMap = {};
    for (const p of parts) {
      if (BORDER_STYLES.has(p)) out['border-style'] = p;
      else if (/^(-?[\d.]|thin|medium|thick)/.test(p)) out['border-width'] = p;
      else out['border-color'] = p;
    }
    return out;
  }
  if (short === 'gap') {
    const [row, col = row] = splitValue(value);
    return { 'row-gap': row, 'column-gap': col };
  }
  // Box-style 1–4 value shorthand.
  const parts = splitValue(value);
  if (!parts.length || parts.includes('/')) return {};
  const [a, b = a, c = a, d = b] = parts;
  const vals = [a, b, c, d];
  return Object.fromEntries(longs.map((l, i) => [l, vals[i]]));
}

/** Value of `prop` in `map`, derived from its shorthand when needed. */
export function readProp(map: StyleMap, prop: string): string | undefined {
  if (map[prop] !== undefined) return map[prop];
  let short = LONGHAND_TO_SHORTHAND[prop];
  while (short) {
    if (map[short] !== undefined) {
      const expanded = expand(short, map[short]);
      if (expanded[prop] !== undefined) return expanded[prop];
      // e.g. border-top-width ← border-width ← border
      for (const [k, v] of Object.entries(expanded)) {
        if (SHORTHANDS[k]?.includes(prop)) return expand(k, v)[prop];
      }
    }
    short = LONGHAND_TO_SHORTHAND[short];
  }
  return undefined;
}

/** True when `map` defines `prop` directly or through a shorthand. */
export function hasProp(map: StyleMap, prop: string): boolean {
  return readProp(map, prop) !== undefined;
}

/**
 * Build a patch that sets `prop` in `map`, expanding any shorthand that
 * covers it so the result has no conflicting declarations.
 */
export function patchProp(map: StyleMap, prop: string, value: string): StyleMap {
  const patch: StyleMap = {};
  let working: StyleMap = { ...map };
  let short = LONGHAND_TO_SHORTHAND[prop];
  const chain: string[] = [];
  while (short) {
    chain.unshift(short);
    short = LONGHAND_TO_SHORTHAND[short];
  }
  for (const s of chain) {
    if (working[s] !== undefined) {
      const expanded = expand(s, working[s]);
      patch[s] = '';
      delete working[s];
      for (const [k, v] of Object.entries(expanded)) {
        if (working[k] === undefined) {
          patch[k] = v;
          working[k] = v;
        }
      }
    }
  }
  // Setting a shorthand clears its longhands.
  const clearLonghands = (s: string) => {
    for (const l of SHORTHANDS[s] ?? []) {
      if (working[l] !== undefined) patch[l] = '';
      clearLonghands(l);
    }
  };
  clearLonghands(prop);
  patch[prop] = value;
  return patch;
}
