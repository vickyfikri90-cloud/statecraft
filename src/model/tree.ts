/**
 * Tree operations. Mutating functions are meant to run on an immer draft.
 */
import { uid } from '../lib/id';
import { VOID_TAGS, type ComponentDoc, type ExpNode, type NodeTag, type StyleMap } from './types';

export function isAncestorOrSelf(doc: ComponentDoc, ancestorId: string, nodeId: string): boolean {
  let cur: string | null = nodeId;
  while (cur) {
    if (cur === ancestorId) return true;
    cur = doc.nodes[cur]?.parentId ?? null;
  }
  return false;
}

export function descendants(doc: ComponentDoc, id: string): string[] {
  const out: string[] = [];
  const visit = (nid: string) => {
    out.push(nid);
    doc.nodes[nid].children.forEach(visit);
  };
  visit(id);
  return out;
}

export function indexInParent(doc: ComponentDoc, id: string): number {
  const parentId = doc.nodes[id].parentId;
  return parentId ? doc.nodes[parentId].children.indexOf(id) : 0;
}

export const canHaveChildren = (node: ExpNode) => !VOID_TAGS.has(node.tag) && node.html === undefined;

export interface NodePreset {
  name: string;
  tag: NodeTag;
  text?: string;
  attrs?: Record<string, string>;
  style: StyleMap;
}

export const NODE_PRESETS: Record<'div' | 'text' | 'button' | 'image' | 'input', NodePreset> = {
  div: {
    name: 'Div',
    tag: 'div',
    style: { display: 'flex', padding: '16px', gap: '8px', 'background-color': '#f0f0f0' },
  },
  text: {
    name: 'Text',
    tag: 'span',
    text: 'Text',
    style: { 'font-size': '14px', color: '#09090b' },
  },
  button: {
    name: 'Button',
    tag: 'button',
    text: 'Button',
    style: {
      padding: '8px 16px',
      border: 'none',
      'border-radius': '8px',
      'background-color': '#09090b',
      color: '#ffffff',
      cursor: 'pointer',
    },
  },
  image: {
    name: 'Image',
    tag: 'img',
    attrs: { src: 'https://picsum.photos/320/200', alt: '' },
    style: { width: '160px', height: '100px', 'object-fit': 'cover', 'border-radius': '8px' },
  },
  input: {
    name: 'Input',
    tag: 'input',
    attrs: { placeholder: 'Type here', type: 'text' },
    style: { padding: '8px 12px', border: '1px solid #d4d4d8', 'border-radius': '8px', 'font-size': '14px' },
  },
};

export function insertNode(
  doc: ComponentDoc,
  preset: NodePreset,
  parentId: string,
  index?: number,
): string {
  const id = uid('n');
  doc.nodes[id] = {
    id,
    name: preset.name,
    tag: preset.tag,
    text: preset.text,
    attrs: preset.attrs ? { ...preset.attrs } : undefined,
    parentId,
    children: [],
  };
  const siblings = doc.nodes[parentId].children;
  siblings.splice(index ?? siblings.length, 0, id);
  doc.styles[doc.states[0].id][id] = { ...preset.style };
  return id;
}

export function removeNode(doc: ComponentDoc, id: string): void {
  if (id === doc.rootId) return;
  const node = doc.nodes[id];
  const parent = node.parentId ? doc.nodes[node.parentId] : null;
  if (parent) parent.children = parent.children.filter((c) => c !== id);
  for (const nid of descendants(doc, id)) removeNodeRecord(doc, nid);
}

/** Move `id` into `parentId` at `index` (index counted after removal). */
export function moveNode(doc: ComponentDoc, id: string, parentId: string, index: number): boolean {
  if (id === doc.rootId || isAncestorOrSelf(doc, id, parentId)) return false;
  if (!canHaveChildren(doc.nodes[parentId])) return false;
  const node = doc.nodes[id];
  const oldParent = doc.nodes[node.parentId!];
  oldParent.children = oldParent.children.filter((c) => c !== id);
  const siblings = doc.nodes[parentId].children;
  siblings.splice(Math.max(0, Math.min(index, siblings.length)), 0, id);
  node.parentId = parentId;
  return true;
}

export function wrapInDiv(doc: ComponentDoc, id: string): string {
  const node = doc.nodes[id];
  const wrapId = uid('n');
  doc.nodes[wrapId] = {
    id: wrapId,
    name: 'Wrapper',
    tag: 'div',
    parentId: node.parentId,
    children: [id],
  };
  if (node.parentId) {
    const siblings = doc.nodes[node.parentId].children;
    siblings[siblings.indexOf(id)] = wrapId;
  } else {
    doc.rootId = wrapId;
    // States triggered by the old root stay on it; the wrapper is only structural.
  }
  node.parentId = wrapId;
  doc.styles[doc.states[0].id][wrapId] = { display: 'flex' };
  return wrapId;
}

/** Replace a node with its children. Not allowed on the root when it has ≠ 1 child. */
export function unwrap(doc: ComponentDoc, id: string): boolean {
  const node = doc.nodes[id];
  if (!node.children.length) return false;
  if (!node.parentId) {
    if (node.children.length !== 1) return false;
    const child = node.children[0];
    doc.nodes[child].parentId = null;
    doc.rootId = child;
  } else {
    const siblings = doc.nodes[node.parentId].children;
    siblings.splice(siblings.indexOf(id), 1, ...node.children);
    for (const c of node.children) doc.nodes[c].parentId = node.parentId;
  }
  node.children = [];
  removeNodeRecord(doc, id);
  return true;
}

function removeNodeRecord(doc: ComponentDoc, id: string) {
  delete doc.nodes[id];
  for (const byNode of Object.values(doc.styles)) delete byNode[id];
  for (const state of doc.states) if (state.triggerId === id) state.triggerId = doc.rootId;
}

export function duplicateNode(doc: ComponentDoc, id: string): string | null {
  const node = doc.nodes[id];
  if (!node.parentId) return null;
  const copy = (srcId: string, parentId: string): string => {
    const src = doc.nodes[srcId];
    const newId = uid('n');
    doc.nodes[newId] = {
      ...src,
      id: newId,
      attrs: src.attrs ? { ...src.attrs } : undefined,
      parentId,
      children: [],
    };
    for (const byNode of Object.values(doc.styles)) {
      if (byNode[srcId]) byNode[newId] = { ...byNode[srcId] };
    }
    doc.nodes[newId].children = src.children.map((c) => copy(c, newId));
    return newId;
  };
  const newId = copy(id, node.parentId);
  doc.nodes[newId].name = `${node.name} copy`;
  const siblings = doc.nodes[node.parentId].children;
  siblings.splice(siblings.indexOf(id) + 1, 0, newId);
  return newId;
}
