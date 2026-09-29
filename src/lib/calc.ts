/**
 * Math in value inputs: "100/2" → "50", "12px*2" → "24px",
 * "100% - 24px" → "calc(100% - 24px)" (mixed units can't be resolved statically).
 */

export const UNITS = ['px', '%', 'em', 'rem', 'vh', 'vw', 'vmin', 'vmax', 'ch', 'fr', 'deg', 'ms', 's'] as const;

type Token =
  | { type: 'num'; value: number; unit: string | null }
  | { type: 'op'; value: '+' | '-' | '*' | '/' }
  | { type: 'paren'; value: '(' | ')' };

type Ast =
  | { type: 'num'; value: number; unit: string | null }
  | { type: 'neg'; arg: Ast }
  | { type: 'bin'; op: '+' | '-' | '*' | '/'; left: Ast; right: Ast };

const NUM_RE = /^(\d*\.?\d+(?:e[+-]?\d+)?)(px|%|em|rem|vh|vw|vmin|vmax|ch|fr|deg|ms|s)?/i;

function tokenize(input: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if ('+-*/'.includes(ch)) {
      tokens.push({ type: 'op', value: ch as '+' | '-' | '*' | '/' });
      i++;
      continue;
    }
    if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', value: ch });
      i++;
      continue;
    }
    const m = NUM_RE.exec(input.slice(i));
    if (!m) return null;
    tokens.push({ type: 'num', value: parseFloat(m[1]), unit: m[2]?.toLowerCase() ?? null });
    i += m[0].length;
  }
  return tokens;
}

function parse(tokens: Token[]): Ast | null {
  let pos = 0;
  const peek = () => tokens[pos];

  function expr(): Ast | null {
    let left = term();
    while (left && peek()?.type === 'op' && (peek().value === '+' || peek().value === '-')) {
      const op = tokens[pos++].value as '+' | '-';
      const right = term();
      if (!right) return null;
      left = { type: 'bin', op, left, right };
    }
    return left;
  }

  function term(): Ast | null {
    let left = factor();
    while (left && peek()?.type === 'op' && (peek().value === '*' || peek().value === '/')) {
      const op = tokens[pos++].value as '*' | '/';
      const right = factor();
      if (!right) return null;
      left = { type: 'bin', op, left, right };
    }
    return left;
  }

  function factor(): Ast | null {
    const t = tokens[pos];
    if (!t) return null;
    if (t.type === 'op' && t.value === '-') {
      pos++;
      const arg = factor();
      return arg ? { type: 'neg', arg } : null;
    }
    if (t.type === 'op' && t.value === '+') {
      pos++;
      return factor();
    }
    if (t.type === 'num') {
      pos++;
      return { type: 'num', value: t.value, unit: t.unit };
    }
    if (t.type === 'paren' && t.value === '(') {
      pos++;
      const inner = expr();
      if (!inner || tokens[pos]?.type !== 'paren' || tokens[pos].value !== ')') return null;
      pos++;
      return inner;
    }
    return null;
  }

  const ast = expr();
  return ast && pos === tokens.length ? ast : null;
}

class MixedUnits extends Error {}

interface Dim {
  n: number;
  unit: string | null;
}

function evaluate(ast: Ast): Dim {
  switch (ast.type) {
    case 'num':
      return { n: ast.value, unit: ast.unit };
    case 'neg': {
      const v = evaluate(ast.arg);
      return { n: -v.n, unit: v.unit };
    }
    case 'bin': {
      const a = evaluate(ast.left);
      const b = evaluate(ast.right);
      if (ast.op === '+' || ast.op === '-') {
        if (a.unit && b.unit && a.unit !== b.unit) throw new MixedUnits();
        const n = ast.op === '+' ? a.n + b.n : a.n - b.n;
        return { n, unit: a.unit ?? b.unit };
      }
      if (ast.op === '*') {
        if (a.unit && b.unit) throw new MixedUnits();
        return { n: a.n * b.n, unit: a.unit ?? b.unit };
      }
      if (b.unit && b.unit !== a.unit) throw new MixedUnits();
      if (b.n === 0) throw new Error('Division by zero');
      // 100px / 2px → unitless ratio
      return { n: a.n / b.n, unit: b.unit ? null : a.unit };
    }
  }
}

function printAst(ast: Ast, parentPrec = 0): string {
  switch (ast.type) {
    case 'num':
      return formatNumber(ast.value) + (ast.unit ?? '');
    case 'neg':
      return `-${printAst(ast.arg, 3)}`;
    case 'bin': {
      const prec = ast.op === '+' || ast.op === '-' ? 1 : 2;
      const s = `${printAst(ast.left, prec)} ${ast.op} ${printAst(ast.right, prec + 1)}`;
      return prec < parentPrec ? `(${s})` : s;
    }
  }
}

export function formatNumber(n: number): string {
  const rounded = Math.round(n * 1000) / 1000;
  return Object.is(rounded, -0) ? '0' : String(rounded);
}

const PASSTHROUGH_RE = /^(-?[a-z][a-z-]*|#[0-9a-f]{3,8}|[a-z-]+\(.*\))$/i;

/**
 * Normalize user input for a CSS value field.
 * Returns `null` when the input is not a valid expression.
 * `defaultUnit` is appended to bare numbers (e.g. "px" for lengths).
 */
export function evaluateValue(raw: string, defaultUnit = ''): string | null {
  const input = raw.trim();
  if (!input) return '';
  // Keywords (auto, none, fit-content), colors, and CSS functions pass through.
  if (PASSTHROUGH_RE.test(input)) return input;

  const tokens = tokenize(input);
  if (!tokens || tokens.length === 0) return null;
  const ast = parse(tokens);
  if (!ast) return null;

  try {
    const { n, unit } = evaluate(ast);
    if (!Number.isFinite(n)) return null;
    const u = unit ?? (n === 0 ? '' : defaultUnit);
    return formatNumber(n) + u;
  } catch (err) {
    if (err instanceof MixedUnits) return `calc(${printAst(ast)})`;
    return null;
  }
}

export interface Dimension {
  num: number;
  unit: string;
}

/** Parse a single `<number><unit>` value; returns null for keywords and expressions. */
export function parseDimension(value: string): Dimension | null {
  const m = /^\s*(-?\d*\.?\d+)([a-z%]*)\s*$/i.exec(value);
  if (!m) return null;
  return { num: parseFloat(m[1]), unit: m[2].toLowerCase() };
}
