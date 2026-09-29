import type { ComponentDoc, StateKind } from '../../model/types';
import { useEditor } from '../../store/editor';
import { STATE_KIND_LABELS } from '../canvas/Workspace';
import { Field, Select, TextInput } from '../ui/controls';
import { ValueInput } from '../ui/ValueInput';
import { Section } from './Section';

export const EASINGS = [
  { value: 'linear', label: 'Linear' },
  { value: 'ease', label: 'Ease' },
  { value: 'ease-in', label: 'Ease in' },
  { value: 'ease-out', label: 'Ease out' },
  { value: 'ease-in-out', label: 'Ease in out' },
  { value: 'cubic-bezier(0.25, 0.1, 0.25, 1)', label: 'Smooth' },
  { value: 'cubic-bezier(0.16, 1, 0.3, 1)', label: 'Expo out' },
  { value: 'cubic-bezier(0.34, 1.56, 0.64, 1)', label: 'Back out (overshoot)' },
  { value: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)', label: 'Back in out' },
];

const KINDS: StateKind[] = ['hover', 'active', 'focus', 'focus-visible', 'disabled', 'custom'];

function nodeOptions(doc: ComponentDoc) {
  const out: { value: string; label: string }[] = [];
  const visit = (id: string, depth: number) => {
    out.push({ value: id, label: `${'  '.repeat(depth)}${doc.nodes[id].name}` });
    doc.nodes[id].children.forEach((c) => visit(c, depth + 1));
  };
  visit(doc.rootId, 0);
  return out;
}

export function StateSection() {
  const doc = useEditor((s) => s.doc);
  const state = useEditor((s) => s.doc.states.find((st) => st.id === s.activeStateId) ?? s.doc.states[0]);
  const update = useEditor((s) => s.updateState);
  const isDefault = state.kind === 'default';
  const t = state.transition;
  const setT = (patch: Partial<typeof t>, coalesce?: string) =>
    update(state.id, { transition: { ...t, ...patch } }, { coalesce: coalesce && `${coalesce}:${state.id}` });

  return (
    <Section title={`State · ${state.name}`}>
      {!isDefault && (
        <div className="inspector-grid is-cols-2">
          <Field label="Name">
            <TextInput value={state.name} onChange={(name) => name.trim() && update(state.id, { name: name.trim() })} />
          </Field>
          <Field label="Type">
            <Select
              value={state.kind}
              options={KINDS.map((k) => ({ value: k, label: STATE_KIND_LABELS[k] }))}
              onChange={(kind) => update(state.id, { kind: kind as StateKind })}
            />
          </Field>
        </div>
      )}
      {!isDefault && (
        <div className="inspector-grid is-cols-1">
          <Field label="Triggered by">
            <Select
              value={state.triggerId}
              options={nodeOptions(doc)}
              onChange={(triggerId) => update(state.id, { triggerId })}
            />
          </Field>
        </div>
      )}
      <div className="inspector-subhead">{isDefault ? 'Transition back to default' : 'Transition into state'}</div>
      <div className="inspector-grid is-cols-2">
        <Field label="Duration">
          <ValueInput
            value={`${t.duration}ms`}
            defaultUnit="ms"
            step={10}
            min={0}
            icon="⏱"
            onChange={(v, o) => setT({ duration: toMs(v) }, o?.coalesce && 'duration')}
          />
        </Field>
        <Field label="Delay">
          <ValueInput
            value={`${t.delay}ms`}
            defaultUnit="ms"
            step={10}
            min={0}
            onChange={(v, o) => setT({ delay: toMs(v) }, o?.coalesce && 'delay')}
          />
        </Field>
      </div>
      <div className="inspector-grid is-cols-1">
        <Field label="Easing">
          <Select
            value={t.easing}
            options={EASINGS.some((e) => e.value === t.easing) ? EASINGS : [...EASINGS, { value: t.easing, label: 'Custom' }]}
            onChange={(easing) => setT({ easing })}
          />
        </Field>
        <Field label="Custom curve">
          <TextInput value={t.easing} mono onChange={(easing) => easing && setT({ easing })} />
        </Field>
        <Field label="Properties">
          <TextInput value={t.property} mono placeholder="all" onChange={(property) => setT({ property: property || 'all' })} />
        </Field>
      </div>
    </Section>
  );
}

function toMs(v: string): number {
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(v.trim().endsWith('ms') || !v.trim().endsWith('s') ? n : n * 1000));
}
