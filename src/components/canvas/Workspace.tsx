import { useMemo, useRef, useState } from 'react';
import { buildEditorCss } from '../../model/css';
import type { ExpState, StateKind } from '../../model/types';
import { useEditor } from '../../store/editor';
import { Icon } from '../ui/Icon';
import { Menu, anchorBelow, type MenuItem } from '../ui/Menu';
import { Canvas, LIVE } from './Canvas';
import './canvas.css';

export const STATE_KIND_LABELS: Record<StateKind, string> = {
  default: 'Default',
  hover: ':hover',
  active: ':active',
  focus: ':focus',
  'focus-visible': ':focus-visible',
  disabled: 'disabled',
  custom: 'custom class',
};

export function addStateMenuItems(): MenuItem[] {
  const add = useEditor.getState().addState;
  return [
    { label: 'Hover', onSelect: () => add('hover') },
    { label: 'Pressed (active)', onSelect: () => add('active') },
    { label: 'Focus', onSelect: () => add('focus') },
    { label: 'Focus visible', onSelect: () => add('focus-visible') },
    { label: 'Disabled', onSelect: () => add('disabled') },
    { type: 'separator' },
    { label: 'Custom state', onSelect: () => add('custom') },
  ];
}

export function Workspace() {
  const doc = useEditor((s) => s.doc);
  const css = useMemo(() => buildEditorCss(doc), [doc]);
  const [split, setSplit] = useState(0.5);
  const ref = useRef<HTMLDivElement>(null);

  const onResize = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = el.getBoundingClientRect();
    const move = (ev: PointerEvent) => {
      setSplit(Math.min(0.8, Math.max(0.2, (ev.clientY - rect.top) / rect.height)));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <main className="workspace" ref={ref}>
      <style>{css}</style>
      <section className="workspace__states ui-scroll" style={{ flexBasis: `${split * 100}%` }}>
        {doc.states.map((state) => (
          <StatePanel key={state.id} state={state} />
        ))}
        <AddStateCard />
      </section>
      <div className="workspace__resizer" onPointerDown={onResize} role="separator" aria-orientation="horizontal" />
      <section className="workspace__preview">
        <PreviewPanel />
      </section>
    </main>
  );
}

function StatePanel({ state }: { state: ExpState }) {
  const active = useEditor((s) => s.activeStateId === state.id);
  const triggerName = useEditor((s) => s.doc.nodes[state.triggerId]?.name);
  const isRootTrigger = useEditor((s) => s.doc.rootId === state.triggerId);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const { setActiveState, duplicateState, removeState } = useEditor.getState();
  const isDefault = state.kind === 'default';

  return (
    <div className={`state-panel${active ? ' is-active' : ''}`}>
      <header className="state-panel__header" onClick={() => setActiveState(state.id)}>
        <span className="state-panel__name">{state.name}</span>
        {!isDefault && (
          <span className="state-panel__kind">
            {STATE_KIND_LABELS[state.kind]}
            {!isRootTrigger && ` on ${triggerName}`}
          </span>
        )}
        <span className="state-panel__spacer" />
        {!isDefault && (
          <button
            type="button"
            className="ui-reset-button state-panel__icon"
            aria-label="State options"
            onClick={(e) => {
              e.stopPropagation();
              setMenu(anchorBelow(e.currentTarget));
            }}
          >
            <Icon name="more" />
          </button>
        )}
      </header>
      <Canvas stateId={state.id} />
      {menu && (
        <Menu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={[
            { label: 'Duplicate', onSelect: () => duplicateState(state.id) },
            { type: 'separator' },
            { label: 'Delete state', danger: true, onSelect: () => removeState(state.id) },
          ]}
        />
      )}
    </div>
  );
}

function AddStateCard() {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  return (
    <>
      <button
        type="button"
        className="ui-reset-button state-add"
        onClick={(e) => setMenu(anchorBelow(e.currentTarget))}
      >
        <Icon name="plus" />
        Add state
      </button>
      {menu && <Menu x={menu.x} y={menu.y} onClose={() => setMenu(null)} items={addStateMenuItems()} />}
    </>
  );
}

function PreviewPanel() {
  const states = useEditor((s) => s.doc.states);
  const liveStates = useEditor((s) => s.liveStates);
  const selectMode = useEditor((s) => s.selectMode);
  const toggleLiveState = useEditor((s) => s.toggleLiveState);
  const [key, setKey] = useState(0);
  const toggles = states.filter((s) => s.kind === 'custom' || s.kind === 'disabled');

  return (
    <div className="state-panel is-preview">
      <header className="state-panel__header">
        <span className="state-panel__name">Preview</span>
        <span className="state-panel__kind">
          {selectMode ? 'Select mode — press V to interact' : 'Interactive'}
        </span>
        <span className="state-panel__spacer" />
        {toggles.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`ui-reset-button preview-toggle${liveStates.includes(s.id) ? ' is-on' : ''}`}
            onClick={() => toggleLiveState(s.id)}
            title={`Toggle "${s.name}"`}
          >
            {s.name}
          </button>
        ))}
        <button
          type="button"
          className="ui-reset-button state-panel__icon"
          title="Reset preview"
          onClick={() => setKey((k) => k + 1)}
        >
          <Icon name="reset" />
        </button>
      </header>
      <Canvas key={key} stateId={LIVE} />
    </div>
  );
}
