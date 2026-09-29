import { patchProp, readProp } from '../../lib/shorthand';
import { DEFAULT_STATE_ID, type StyleMap } from '../../model/types';
import { useEditor } from '../../store/editor';
import type { CommitOptions } from '../ui/ValueInput';

const EMPTY: StyleMap = {};

export interface StyleProp {
  /** Value set in the active state ('' when not set there). */
  value: string;
  /** Inherited value shown greyed out (from the default state). */
  placeholder: string;
  /** Set in a non-default state. */
  overridden: boolean;
  set: (value: string, opts?: CommitOptions) => void;
  reset: () => void;
}

export function useOwnStyle(nodeId: string): StyleMap {
  return useEditor((s) => s.doc.styles[s.activeStateId]?.[nodeId] ?? EMPTY);
}

export function useStyleProp(nodeId: string, prop: string): StyleProp {
  const stateId = useEditor((s) => s.activeStateId);
  const own = useOwnStyle(nodeId);
  const base = useEditor((s) => s.doc.styles[DEFAULT_STATE_ID]?.[nodeId] ?? EMPTY);
  const isDefault = stateId === DEFAULT_STATE_ID;
  const ownValue = readProp(own, prop);

  const set = (value: string, opts?: CommitOptions) => {
    const current = useEditor.getState();
    const map = current.doc.styles[current.activeStateId]?.[nodeId] ?? EMPTY;
    current.setStyles(nodeId, patchProp(map, prop, value), {
      coalesce: opts?.coalesce ? `${opts.coalesce}:${nodeId}:${prop}` : undefined,
    });
  };

  return {
    value: ownValue ?? '',
    placeholder: isDefault ? '' : (readProp(base, prop) ?? ''),
    overridden: !isDefault && ownValue !== undefined,
    set,
    reset: () => set(''),
  };
}

/** Effective value (active state over default), for conditional UI like "display: flex". */
export function useResolvedProp(nodeId: string, prop: string): string {
  const p = useStyleProp(nodeId, prop);
  return p.value || p.placeholder;
}
