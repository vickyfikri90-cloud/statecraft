import { useMemo, useState } from 'react';
import { evaluateValue } from '../../lib/calc';
import { useEditor } from '../../store/editor';
import { Icon } from '../ui/Icon';
import { Section } from './Section';
import { useOwnStyle } from './useStyleProp';

let cssPropertyNames: string[] | null = null;
function allCssProperties(): string[] {
  if (!cssPropertyNames) {
    const style = document.body.style as unknown as Record<string, unknown>;
    const names = new Set<string>();
    for (const key in style) {
      if (typeof style[key] !== 'string' || /^\d/.test(key) || key === 'cssText') continue;
      names.add(key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`).replace(/^webkit-/, '-webkit-'));
    }
    cssPropertyNames = [...names].sort();
  }
  return cssPropertyNames;
}

const normalize = (v: string) => evaluateValue(v) ?? v.trim();

/** Every declaration set on the node in the active state, editable as raw CSS. */
export function CssSection({ nodeId }: { nodeId: string }) {
  const own = useOwnStyle(nodeId);
  const setStyles = useEditor((s) => s.setStyles);
  const stateName = useEditor((s) => s.doc.states.find((st) => st.id === s.activeStateId)?.name);
  const [newProp, setNewProp] = useState('');
  const [newValue, setNewValue] = useState('');
  const props = useMemo(allCssProperties, []);

  const add = () => {
    const prop = newProp.trim().toLowerCase();
    if (!prop || !newValue.trim()) return;
    setStyles(nodeId, { [prop]: normalize(newValue) });
    setNewProp('');
    setNewValue('');
  };

  return (
    <Section title={`CSS · ${stateName}`}>
      <datalist id="css-properties">
        {props.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      <div className="css-list">
        {Object.entries(own).map(([prop, value]) => (
          <div className="css-row" key={prop}>
            <span className="css-row__prop" title={prop}>
              {prop}
            </span>
            <input
              className="css-row__value"
              defaultValue={value}
              key={value}
              spellCheck={false}
              onBlur={(e) => {
                const v = normalize(e.target.value);
                if (v !== value) setStyles(nodeId, { [prop]: v });
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
            />
            <button
              type="button"
              className="ui-reset-button css-row__remove"
              title="Remove"
              onClick={() => setStyles(nodeId, { [prop]: '' })}
            >
              <Icon name="close" size={12} />
            </button>
          </div>
        ))}
        {!Object.keys(own).length && <div className="css-empty">No declarations in this state.</div>}
        <div className="css-row is-new">
          <input
            className="css-row__prop"
            placeholder="property"
            list="css-properties"
            value={newProp}
            spellCheck={false}
            onChange={(e) => setNewProp(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.currentTarget.nextElementSibling as HTMLInputElement)?.focus();
            }}
          />
          <input
            className="css-row__value"
            placeholder="value"
            value={newValue}
            spellCheck={false}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add();
            }}
          />
          <button type="button" className="ui-reset-button css-row__remove" title="Add" onClick={add}>
            <Icon name="plus" size={12} />
          </button>
        </div>
      </div>
    </Section>
  );
}
