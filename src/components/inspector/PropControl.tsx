import type { ReactNode } from 'react';
import { evaluateValue } from '../../lib/calc';
import { ColorInput, Field, Segmented, Select, TextInput, type Option } from '../ui/controls';
import { LENGTH_UNITS, ValueInput } from '../ui/ValueInput';
import { useStyleProp } from './useStyleProp';

export type PropDef =
  | {
      prop: string;
      label: string;
      type: 'length';
      units?: readonly string[];
      icon?: ReactNode;
      min?: number;
      defaultUnit?: string;
    }
  | { prop: string; label: string; type: 'number'; step?: number; min?: number; max?: number; icon?: ReactNode }
  | { prop: string; label: string; type: 'color' }
  | { prop: string; label: string; type: 'select'; options: Option[] }
  | { prop: string; label: string; type: 'segmented'; options: { value: string; label: ReactNode }[] }
  | { prop: string; label: string; type: 'text'; mono?: boolean; list?: string; placeholder?: string };

export function PropControl({ nodeId, def, hideLabel }: { nodeId: string; def: PropDef; hideLabel?: boolean }) {
  const p = useStyleProp(nodeId, def.prop);
  const control = (() => {
    switch (def.type) {
      case 'length':
        return (
          <ValueInput
            value={p.value}
            placeholder={p.placeholder}
            onChange={p.set}
            units={def.units ?? LENGTH_UNITS}
            defaultUnit={def.defaultUnit ?? 'px'}
            icon={def.icon}
            min={def.min}
            highlighted={p.overridden}
            title={def.label}
          />
        );
      case 'number':
        return (
          <ValueInput
            value={p.value}
            placeholder={p.placeholder}
            onChange={p.set}
            defaultUnit=""
            step={def.step}
            min={def.min}
            max={def.max}
            icon={def.icon}
            highlighted={p.overridden}
            title={def.label}
          />
        );
      case 'color':
        return <ColorInput value={p.value} placeholder={p.placeholder} onChange={p.set} highlighted={p.overridden} />;
      case 'select':
        return (
          <Select
            value={p.value}
            placeholder={p.placeholder || '—'}
            options={def.options}
            onChange={p.set}
            highlighted={p.overridden}
          />
        );
      case 'segmented':
        return (
          <Segmented
            value={p.value || p.placeholder}
            options={def.options}
            onChange={p.set}
            highlighted={p.overridden}
          />
        );
      case 'text':
        return (
          <TextInput
            value={p.value}
            placeholder={p.placeholder || def.placeholder}
            onChange={(v) => p.set(evaluateValue(v) ?? v)}
            highlighted={p.overridden}
            mono={def.mono}
            list={def.list}
          />
        );
    }
  })();

  if (hideLabel) return control;
  return (
    <Field label={def.label} overridden={p.overridden} onReset={p.reset}>
      {control}
    </Field>
  );
}
