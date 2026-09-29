import { useId, useRef, useState, type ReactNode } from 'react';
import { UNITS, evaluateValue, formatNumber, parseDimension } from '../../lib/calc';
import { Menu, anchorBelow, type MenuItem } from './Menu';

export const LENGTH_UNITS = ['px', '%', 'em', 'rem', 'vh', 'vw', 'auto'] as const;

export interface CommitOptions {
  coalesce?: string;
}

interface ValueInputProps {
  value: string;
  placeholder?: string;
  onChange: (value: string, opts?: CommitOptions) => void;
  /** Units (and keywords) offered in the unit menu. Omit for no menu. */
  units?: readonly string[];
  /** Appended to bare numbers, e.g. "px". Empty for unitless values. */
  defaultUnit?: string;
  /** Scrub handle: drag horizontally to change the value. */
  icon?: ReactNode;
  step?: number;
  min?: number;
  max?: number;
  highlighted?: boolean;
  title?: string;
}

/**
 * Text input for CSS values with math ("100/2"), unit menu,
 * ↑/↓ nudging (Shift ×10, Alt ×0.1) and drag-to-scrub on the icon.
 */
export function ValueInput({
  value,
  placeholder,
  onChange,
  units,
  defaultUnit = 'px',
  icon,
  step = 1,
  min,
  max,
  highlighted,
  title,
}: ValueInputProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const current = parseDimension(value || placeholder || '');
  const bareUnit = current && current.unit ? current.unit : defaultUnit;

  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));

  const clampValue = (v: string) => {
    const d = parseDimension(v);
    return d ? formatNumber(clamp(d.num)) + d.unit : v;
  };

  const commit = (text: string) => {
    if (text.trim() === value) return;
    const result = evaluateValue(text, bareUnit);
    if (result === null) {
      setError(true);
      setTimeout(() => setError(false), 700);
      return;
    }
    onChange(clampValue(result));
  };

  const nudge = (dir: 1 | -1, e: { shiftKey: boolean; altKey: boolean }) => {
    const base = parseDimension(draft ?? value) ?? current ?? { num: 0, unit: defaultUnit };
    const mult = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
    const next = formatNumber(clamp(base.num + dir * step * mult)) + (base.unit || defaultUnit);
    setDraft(next);
    onChange(next, { coalesce: `nudge${id}` });
  };

  const onScrubStart = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const start = current ?? { num: 0, unit: defaultUnit };
    const startX = e.clientX;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    document.body.style.cursor = 'ew-resize';
    const onMove = (ev: PointerEvent) => {
      const mult = ev.shiftKey ? 10 : ev.altKey ? 0.1 : 1;
      const delta = Math.round((ev.clientX - startX) / 2) * step * mult;
      const next = formatNumber(clamp(start.num + delta)) + (start.unit || defaultUnit);
      onChange(next, { coalesce: `scrub${id}` });
    };
    const onUp = () => {
      document.body.style.cursor = '';
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('pointercancel', onUp);
    };
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('pointercancel', onUp);
  };

  const unitLabel = !value
    ? ''
    : current
      ? current.unit
      : value.startsWith('calc(')
        ? 'calc'
        : '';

  const unitItems: MenuItem[] = (units ?? []).map((u) => ({
    label: u,
    checked: unitLabel === u || value === u,
    onSelect: () => {
      if (!(UNITS as readonly string[]).includes(u)) {
        // Keyword such as "auto".
        onChange(u);
        return;
      }
      const num = current?.num ?? 0;
      onChange(formatNumber(num) + u);
    },
  }));

  return (
    <div
      className={`ui-input${error ? ' is-error' : ''}${highlighted ? ' is-highlighted' : ''}`}
      title={title}
    >
      {icon !== undefined && (
        <span className="ui-input__icon is-scrub" onPointerDown={onScrubStart}>
          {icon}
        </span>
      )}
      <input
        ref={inputRef}
        className="ui-input__field"
        value={draft ?? value}
        placeholder={placeholder}
        spellCheck={false}
        onFocus={(e) => {
          setDraft(value);
          e.currentTarget.select();
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== null) commit(draft);
          setDraft(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commit(draft ?? value);
            setDraft(null);
            // Re-sync after the store updates, then keep editing.
            requestAnimationFrame(() => {
              if (document.activeElement === inputRef.current) {
                setDraft(inputRef.current!.value);
                inputRef.current!.select();
              }
            });
          } else if (e.key === 'Escape') {
            setDraft(null);
            inputRef.current?.blur();
          } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            nudge(e.key === 'ArrowUp' ? 1 : -1, e);
          }
        }}
      />
      {units && (
        <button
          type="button"
          className="ui-reset-button ui-input__unit"
          tabIndex={-1}
          onClick={(e) => setMenu(anchorBelow(e.currentTarget))}
        >
          {unitLabel || '—'}
        </button>
      )}
      {menu && <Menu items={unitItems} x={menu.x} y={menu.y} onClose={() => setMenu(null)} minWidth={72} />}
    </div>
  );
}
