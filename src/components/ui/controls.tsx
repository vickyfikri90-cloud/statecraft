import { useState, type ReactNode } from 'react';
import { formatColor, isColor, parseColor, toHex } from '../../lib/color';
import { Icon } from './Icon';
import { Menu, anchorBelow } from './Menu';
import type { CommitOptions } from './ValueInput';

export type Option = string | { value: string; label: string };
const optValue = (o: Option) => (typeof o === 'string' ? o : o.value);
const optLabel = (o: Option) => (typeof o === 'string' ? o : o.label);

// ---------------------------------------------------------------------------

interface FieldProps {
  label: string;
  /** Property overridden in the active state: label turns accent + reset button. */
  overridden?: boolean;
  onReset?: () => void;
  children: ReactNode;
  inline?: boolean;
}

export function Field({ label, overridden, onReset, children, inline }: FieldProps) {
  return (
    <div className={`ui-field${inline ? ' is-inline' : ''}`}>
      <div className="ui-field__label">
        <span className={overridden ? 'is-overridden' : undefined}>{label}</span>
        {overridden && onReset && (
          <button type="button" className="ui-reset-button ui-field__reset" title="Reset to default" onClick={onReset}>
            <Icon name="reset" size={12} />
          </button>
        )}
      </div>
      <div className="ui-field__control">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------

interface TextInputProps {
  value: string;
  onChange: (value: string, opts?: CommitOptions) => void;
  placeholder?: string;
  highlighted?: boolean;
  multiline?: boolean;
  /** Commit on every keystroke (coalesced) instead of on blur/enter. */
  live?: boolean;
  mono?: boolean;
  list?: string;
  validate?: (value: string) => boolean;
}

export function TextInput({
  value,
  onChange,
  placeholder,
  highlighted,
  multiline,
  live,
  mono,
  list,
  validate,
}: TextInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const commit = (v: string) => {
    if (v === value) return;
    if (validate && v && !validate(v)) {
      setError(true);
      setTimeout(() => setError(false), 700);
      return;
    }
    onChange(v);
  };
  const common = {
    className: `ui-input__field${mono ? ' is-mono' : ''}`,
    value: live ? value : (draft ?? value),
    placeholder,
    spellCheck: false,
    onFocus: () => setDraft(value),
    onBlur: () => {
      if (!live && draft !== null) commit(draft);
      setDraft(null);
    },
  };
  return (
    <div
      className={`ui-input${multiline ? ' is-multiline' : ''}${highlighted ? ' is-highlighted' : ''}${error ? ' is-error' : ''}`}
    >
      {multiline ? (
        <textarea
          {...common}
          rows={3}
          onChange={(e) => (live ? onChange(e.target.value, { coalesce: 'text' }) : setDraft(e.target.value))}
        />
      ) : (
        <input
          {...common}
          list={list}
          onChange={(e) => (live ? onChange(e.target.value, { coalesce: 'text' }) : setDraft(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') {
              setDraft(null);
              requestAnimationFrame(() => (e.target as HTMLInputElement).blur());
            }
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

interface SelectProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  highlighted?: boolean;
}

export function Select({ value, options, onChange, placeholder = '—', highlighted }: SelectProps) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const match = options.find((o) => optValue(o) === value);
  return (
    <>
      <button
        type="button"
        className={`ui-reset-button ui-input ui-select${highlighted ? ' is-highlighted' : ''}`}
        onClick={(e) => setMenu(anchorBelow(e.currentTarget))}
      >
        <span className={`ui-select__value${value ? '' : ' ui-muted'}`}>
          {match ? optLabel(match) : value || placeholder}
        </span>
        <Icon name="chevronDown" size={12} />
      </button>
      {menu && (
        <Menu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={options.map((o) => ({
            label: optLabel(o),
            checked: optValue(o) === value,
            onSelect: () => onChange(optValue(o)),
          }))}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------

interface SegmentedProps {
  value: string;
  options: { value: string; label: ReactNode; title?: string }[];
  onChange: (value: string) => void;
  highlighted?: boolean;
}

export function Segmented({ value, options, onChange, highlighted }: SegmentedProps) {
  return (
    <div className={`ui-segmented${highlighted ? ' is-highlighted' : ''}`} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          title={o.title ?? o.value}
          className={`ui-reset-button ui-segmented__item${o.value === value ? ' is-active' : ''}`}
          onClick={() => onChange(o.value === value ? '' : o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------

interface ColorInputProps {
  value: string;
  placeholder?: string;
  onChange: (value: string, opts?: CommitOptions) => void;
  highlighted?: boolean;
}

export function ColorInput({ value, placeholder, onChange, highlighted }: ColorInputProps) {
  const effective = value || placeholder || '';
  const rgba = parseColor(effective);
  const [draft, setDraft] = useState<string | null>(null);
  const [alphaDraft, setAlphaDraft] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const commit = (v: string) => {
    const t = v.trim();
    if (t === value) return;
    if (t && !isColor(t) && !t.startsWith('var(')) {
      setError(true);
      setTimeout(() => setError(false), 700);
      return;
    }
    onChange(t);
  };

  const commitAlpha = (text: string) => {
    if (!rgba) return;
    const n = parseFloat(text);
    if (!Number.isFinite(n)) return;
    onChange(formatColor({ ...rgba, a: Math.min(100, Math.max(0, n)) / 100 }));
  };

  return (
    <div className={`ui-input ui-color${highlighted ? ' is-highlighted' : ''}${error ? ' is-error' : ''}`}>
      <label className="ui-color__swatch" style={{ '--swatch': effective || 'transparent' } as React.CSSProperties}>
        <input
          type="color"
          value={rgba ? toHex(rgba) : '#000000'}
          onChange={(e) => {
            const picked = parseColor(e.target.value)!;
            onChange(formatColor({ ...picked, a: rgba?.a ?? 1 }), { coalesce: 'color-picker' });
          }}
        />
      </label>
      <input
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
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
      <input
        className="ui-input__field ui-color__alpha"
        value={alphaDraft ?? (rgba ? String(Math.round(rgba.a * 100)) : '')}
        onFocus={(e) => {
          setAlphaDraft(e.currentTarget.value);
          e.currentTarget.select();
        }}
        onChange={(e) => setAlphaDraft(e.target.value)}
        onBlur={() => {
          if (alphaDraft !== null) commitAlpha(alphaDraft);
          setAlphaDraft(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        aria-label="Opacity"
      />
      <span className="ui-color__pct">%</span>
    </div>
  );
}
