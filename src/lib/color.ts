export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

let ctx: CanvasRenderingContext2D | null = null;

export function isColor(value: string): boolean {
  return typeof CSS !== 'undefined' && CSS.supports('color', value);
}

/** Resolve any CSS color (names, hsl, hex…) to RGBA. Returns null for non-colors. */
export function parseColor(value: string): Rgba | null {
  if (!value || !isColor(value)) return null;
  ctx ??= document.createElement('canvas').getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#000';
  ctx.fillStyle = value;
  const out = ctx.fillStyle; // "#rrggbb" or "rgba(r, g, b, a)"
  if (out.startsWith('#')) {
    const n = parseInt(out.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const m = /rgba?\(([^)]+)\)/.exec(out);
  if (!m) return null;
  const [r, g, b, a = '1'] = m[1].split(',').map((s) => s.trim());
  return { r: +r, g: +g, b: +b, a: +a };
}

const hex2 = (n: number) => n.toString(16).padStart(2, '0');

export function toHex({ r, g, b }: Rgba): string {
  return `#${hex2(r)}${hex2(g)}${hex2(b)}`;
}

export function formatColor(c: Rgba): string {
  if (c.a >= 1) return toHex(c);
  const a = Math.round(c.a * 100) / 100;
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${a})`;
}
