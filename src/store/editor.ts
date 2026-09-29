import { produce } from 'immer';
import { create } from 'zustand';
import type { FsFileHandle } from '../lib/fs';
import { uid } from '../lib/id';
import { DEFAULT_TRANSITION, TEMPLATES } from '../model/templates';
import * as tree from '../model/tree';
import type { ComponentDoc, ExpState, StateKind, StyleMap } from '../model/types';
import { DEFAULT_STATE_ID } from '../model/types';

const HISTORY_LIMIT = 200;
const COALESCE_MS = 800;

export interface EditorState {
  doc: ComponentDoc;
  /** Last saved/opened doc; `doc !== savedDoc` means unsaved changes. */
  savedDoc: ComponentDoc | null;
  file: { name: string; handle: FsFileHandle | null } | null;

  past: ComponentDoc[];
  future: ComponentDoc[];
  lastEdit: { key: string; at: number } | null;

  selectedId: string | null;
  hoveredId: string | null;
  activeStateId: string;
  /** Inspect mode: clicking in any canvas selects an element. */
  selectMode: boolean;
  /** Custom/disabled states toggled on in the live preview. */
  liveStates: string[];
  /** Layer currently being renamed inline. */
  renamingId: string | null;
  toast: { id: number; message: string; tone: 'info' | 'error' } | null;
}

interface EditOptions {
  /** Edits with the same key within 800ms merge into one undo step. */
  coalesce?: string;
}

export interface EditorActions {
  edit(recipe: (draft: ComponentDoc) => void, opts?: EditOptions): void;
  undo(): void;
  redo(): void;

  loadDoc(doc: ComponentDoc, file: EditorState['file'], opts?: { saved?: boolean }): void;
  markSaved(file: EditorState['file']): void;

  select(id: string | null): void;
  hover(id: string | null): void;
  setActiveState(id: string): void;
  setSelectMode(on: boolean): void;
  toggleLiveState(id: string): void;
  setRenaming(id: string | null): void;
  rename(id: string, name: string): void;
  notify(message: string, tone?: 'info' | 'error'): void;

  setStyle(nodeId: string, prop: string, value: string, opts?: EditOptions): void;
  setStyles(nodeId: string, map: StyleMap, opts?: EditOptions): void;
  resetStyle(nodeId: string, prop: string): void;

  addState(kind: StateKind): void;
  removeState(id: string): void;
  duplicateState(id: string): void;
  updateState(id: string, patch: Partial<Omit<ExpState, 'id'>>, opts?: EditOptions): void;

  insert(preset: tree.NodePreset, parentId?: string): void;
  remove(id: string): void;
  duplicate(id: string): void;
  wrap(id: string): void;
  unwrap(id: string): void;
  move(id: string, parentId: string, index: number): void;
}

export type EditorStore = EditorState & EditorActions;

const initialDoc = TEMPLATES.find((t) => t.id === 'button')!.create();

let toastSeq = 0;

export const useEditor = create<EditorStore>()((set, get) => {
  const edit: EditorActions['edit'] = (recipe, opts) => {
    const { doc, past, lastEdit } = get();
    const next = produce(doc, (d) => {
      recipe(d);
    });
    if (next === doc) return;
    const stamped = produce(next, (d) => {
      d.updatedAt = new Date().toISOString();
    });
    const now = Date.now();
    const merge = opts?.coalesce && lastEdit?.key === opts.coalesce && now - lastEdit.at < COALESCE_MS;
    set({
      doc: stamped,
      past: merge ? past : [...past, doc].slice(-HISTORY_LIMIT),
      future: [],
      lastEdit: opts?.coalesce ? { key: opts.coalesce, at: now } : null,
    });
    sanitizeSelection();
  };

  /** Drop selection / active state that no longer exist after an edit or undo. */
  const sanitizeSelection = () => {
    const { doc, selectedId, activeStateId, liveStates } = get();
    const patch: Partial<EditorState> = {};
    if (selectedId && !doc.nodes[selectedId]) patch.selectedId = null;
    if (!doc.states.some((s) => s.id === activeStateId)) patch.activeStateId = DEFAULT_STATE_ID;
    const live = liveStates.filter((id) => doc.states.some((s) => s.id === id));
    if (live.length !== liveStates.length) patch.liveStates = live;
    if (Object.keys(patch).length) set(patch);
  };

  return {
    doc: initialDoc,
    savedDoc: initialDoc,
    file: null,
    past: [],
    future: [],
    lastEdit: null,
    selectedId: null,
    hoveredId: null,
    activeStateId: DEFAULT_STATE_ID,
    selectMode: false,
    liveStates: [],
    renamingId: null,
    toast: null,

    edit,

    undo() {
      const { past, doc, future } = get();
      if (!past.length) return;
      set({ doc: past[past.length - 1], past: past.slice(0, -1), future: [doc, ...future], lastEdit: null });
      sanitizeSelection();
    },

    redo() {
      const { past, doc, future } = get();
      if (!future.length) return;
      set({ doc: future[0], past: [...past, doc], future: future.slice(1), lastEdit: null });
      sanitizeSelection();
    },

    loadDoc(doc, file, opts) {
      set({
        doc,
        savedDoc: opts?.saved === false ? null : doc,
        file,
        past: [],
        future: [],
        lastEdit: null,
        selectedId: doc.rootId,
        hoveredId: null,
        activeStateId: DEFAULT_STATE_ID,
        liveStates: [],
      });
    },

    markSaved(file) {
      set({ savedDoc: get().doc, file });
    },

    select: (id) => set({ selectedId: id }),
    hover: (id) => {
      if (get().hoveredId !== id) set({ hoveredId: id });
    },
    setActiveState: (id) => set({ activeStateId: id }),
    setSelectMode: (on) => set({ selectMode: on, hoveredId: null }),
    toggleLiveState: (id) => {
      const { liveStates } = get();
      set({ liveStates: liveStates.includes(id) ? liveStates.filter((s) => s !== id) : [...liveStates, id] });
    },
    setRenaming: (id) => set({ renamingId: id }),
    rename(id, name) {
      const trimmed = name.trim();
      if (!trimmed) return;
      edit((d) => {
        if (d.nodes[id]) d.nodes[id].name = trimmed;
      });
    },
    notify: (message, tone = 'info') => set({ toast: { id: ++toastSeq, message, tone } }),

    setStyle(nodeId, prop, value, opts) {
      get().setStyles(nodeId, { [prop]: value }, opts);
    },

    setStyles(nodeId, map, opts) {
      const stateId = get().activeStateId;
      edit((d) => {
        const byNode = (d.styles[stateId] ??= {});
        const target = (byNode[nodeId] ??= {});
        for (const [prop, value] of Object.entries(map)) {
          if (value === '') delete target[prop];
          else target[prop] = value;
        }
        if (stateId !== DEFAULT_STATE_ID && !Object.keys(target).length) delete byNode[nodeId];
      }, opts);
    },

    resetStyle(nodeId, prop) {
      get().setStyles(nodeId, { [prop]: '' });
    },

    addState(kind) {
      const id = uid('s');
      const labels: Record<StateKind, string> = {
        default: 'Default',
        hover: 'Hover',
        active: 'Pressed',
        focus: 'Focus',
        'focus-visible': 'Focus visible',
        disabled: 'Disabled',
        custom: 'Custom',
      };
      edit((d) => {
        const base = labels[kind];
        let name = base;
        for (let i = 2; d.states.some((s) => s.name === name); i++) name = `${base} ${i}`;
        d.states.push({ id, name, kind, triggerId: d.rootId, transition: { ...DEFAULT_TRANSITION } });
        d.styles[id] = {};
      });
      set({ activeStateId: id });
    },

    removeState(id) {
      if (id === DEFAULT_STATE_ID) return;
      edit((d) => {
        d.states = d.states.filter((s) => s.id !== id);
        delete d.styles[id];
      });
    },

    duplicateState(id) {
      const newId = uid('s');
      edit((d) => {
        const src = d.states.find((s) => s.id === id);
        if (!src || src.kind === 'default') return;
        const index = d.states.indexOf(src);
        d.states.splice(index + 1, 0, {
          ...src,
          id: newId,
          name: `${src.name} copy`,
          transition: { ...src.transition },
        });
        d.styles[newId] = structuredClone(d.styles[id] ?? {});
      });
      set({ activeStateId: newId });
    },

    updateState(id, patch, opts) {
      edit((d) => {
        const state = d.states.find((s) => s.id === id);
        if (state) Object.assign(state, patch);
      }, opts);
    },

    insert(preset, parentId) {
      const { doc, selectedId } = get();
      let parent = parentId ?? selectedId ?? doc.rootId;
      let index: number | undefined;
      if (!tree.canHaveChildren(doc.nodes[parent])) {
        // Insert after a void element (img/input) instead of inside it.
        index = tree.indexInParent(doc, parent) + 1;
        parent = doc.nodes[parent].parentId ?? doc.rootId;
      }
      let newId = '';
      edit((d) => {
        newId = tree.insertNode(d, preset, parent, index);
      });
      set({ selectedId: newId });
    },

    remove(id) {
      const parentId = get().doc.nodes[id]?.parentId;
      edit((d) => tree.removeNode(d, id));
      if (parentId) set({ selectedId: parentId });
    },

    duplicate(id) {
      let newId: string | null = null;
      edit((d) => {
        newId = tree.duplicateNode(d, id);
      });
      if (newId) set({ selectedId: newId });
    },

    wrap(id) {
      let wrapId = '';
      edit((d) => {
        wrapId = tree.wrapInDiv(d, id);
      });
      set({ selectedId: wrapId });
    },

    unwrap(id) {
      const first = get().doc.nodes[id]?.children[0];
      edit((d) => {
        tree.unwrap(d, id);
      });
      if (first) set({ selectedId: first });
    },

    move(id, parentId, index) {
      edit((d) => {
        tree.moveNode(d, id, parentId, index);
      });
    },
  };
});

export const selectIsDirty = (s: EditorState) => s.doc !== s.savedDoc;

/** Default styles merged with the active state's overrides. */
export function resolveStyle(doc: ComponentDoc, stateId: string, nodeId: string): StyleMap {
  const base = doc.styles[DEFAULT_STATE_ID]?.[nodeId] ?? {};
  if (stateId === DEFAULT_STATE_ID) return base;
  return { ...base, ...(doc.styles[stateId]?.[nodeId] ?? {}) };
}
