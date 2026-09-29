import { uid } from '../lib/id';
import type { ComponentDoc, ExpState, NodeTag, StateKind, StyleMap, Transition } from './types';
import { DEFAULT_STATE_ID } from './types';

export const DEFAULT_TRANSITION: Transition = {
  duration: 200,
  delay: 0,
  easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  property: 'all',
};

interface NodeSpec {
  key: string;
  name: string;
  tag: NodeTag;
  text?: string;
  attrs?: Record<string, string>;
  style: StyleMap;
  children?: NodeSpec[];
}

interface StateSpec {
  name: string;
  kind: StateKind;
  /** Node key; defaults to root. */
  trigger?: string;
  transition?: Partial<Transition>;
  styles: Record<string, StyleMap>;
}

export function buildDoc(
  name: string,
  root: NodeSpec,
  states: StateSpec[] = [],
  background = '#f4f4f5',
): ComponentDoc {
  const now = new Date().toISOString();
  const keyToId: Record<string, string> = {};
  const doc: ComponentDoc = {
    id: uid('doc'),
    name,
    createdAt: now,
    updatedAt: now,
    canvas: { background },
    rootId: '',
    nodes: {},
    states: [],
    styles: { [DEFAULT_STATE_ID]: {} },
  };

  const add = (spec: NodeSpec, parentId: string | null): string => {
    const id = uid('n');
    keyToId[spec.key] = id;
    doc.nodes[id] = {
      id,
      name: spec.name,
      tag: spec.tag,
      text: spec.text,
      attrs: spec.attrs,
      parentId,
      children: [],
    };
    doc.styles[DEFAULT_STATE_ID][id] = { ...spec.style };
    doc.nodes[id].children = (spec.children ?? []).map((c) => add(c, id));
    return id;
  };
  doc.rootId = add(root, null);

  doc.states.push({
    id: DEFAULT_STATE_ID,
    name: 'Default',
    kind: 'default',
    triggerId: doc.rootId,
    transition: { ...DEFAULT_TRANSITION },
  });
  for (const s of states) {
    const state: ExpState = {
      id: uid('s'),
      name: s.name,
      kind: s.kind,
      triggerId: s.trigger ? keyToId[s.trigger] : doc.rootId,
      transition: { ...DEFAULT_TRANSITION, ...s.transition },
    };
    doc.states.push(state);
    doc.styles[state.id] = {};
    for (const [key, map] of Object.entries(s.styles)) doc.styles[state.id][keyToId[key]] = { ...map };
  }
  return doc;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  create: () => ComponentDoc;
}

export const TEMPLATES: Template[] = [
  {
    id: 'blank',
    name: 'Blank',
    description: 'One empty frame',
    create: () =>
      buildDoc('Untitled', {
        key: 'root',
        name: 'Frame',
        tag: 'div',
        style: {
          display: 'flex',
          width: '240px',
          height: '160px',
          'background-color': '#ffffff',
          'border-radius': '12px',
        },
      }),
  },
  {
    id: 'button',
    name: 'Button',
    description: 'Hover + pressed states',
    create: () =>
      buildDoc(
        'Button',
        {
          key: 'root',
          name: 'Button',
          tag: 'button',
          style: {
            display: 'inline-flex',
            'align-items': 'center',
            gap: '8px',
            padding: '12px 20px',
            border: 'none',
            'border-radius': '999px',
            'background-color': '#09090b',
            color: '#ffffff',
            'font-family': 'Inter, sans-serif',
            'font-size': '14px',
            'font-weight': '500',
            cursor: 'pointer',
          },
          children: [
            { key: 'label', name: 'Label', tag: 'span', text: 'Get started', style: {} },
            { key: 'arrow', name: 'Arrow', tag: 'span', text: '→', style: { display: 'inline-block' } },
          ],
        },
        [
          {
            name: 'Hover',
            kind: 'hover',
            styles: {
              root: { 'background-color': '#27272a' },
              arrow: { transform: 'translateX(4px)' },
            },
          },
          {
            name: 'Pressed',
            kind: 'active',
            transition: { duration: 80 },
            styles: { root: { transform: 'scale(0.96)' } },
          },
        ],
      ),
  },
  {
    id: 'card',
    name: 'Card',
    description: 'Lift on hover',
    create: () =>
      buildDoc(
        'Card',
        {
          key: 'root',
          name: 'Card',
          tag: 'div',
          style: {
            display: 'flex',
            'flex-direction': 'column',
            width: '280px',
            overflow: 'hidden',
            'background-color': '#ffffff',
            'border-radius': '16px',
            'box-shadow': '0 1px 2px rgba(0, 0, 0, 0.08)',
            'font-family': 'Inter, sans-serif',
          },
          children: [
            {
              key: 'media',
              name: 'Media',
              tag: 'div',
              style: { height: '160px', overflow: 'hidden' },
              children: [
                {
                  key: 'image',
                  name: 'Image',
                  tag: 'img',
                  attrs: { src: 'https://picsum.photos/seed/statecraft/560/320', alt: '' },
                  style: { display: 'block', width: '100%', height: '100%', 'object-fit': 'cover' },
                },
              ],
            },
            {
              key: 'body',
              name: 'Body',
              tag: 'div',
              style: { display: 'flex', 'flex-direction': 'column', gap: '4px', padding: '16px' },
              children: [
                {
                  key: 'title',
                  name: 'Title',
                  tag: 'h3',
                  text: 'Card title',
                  style: { margin: '0', 'font-size': '16px', 'font-weight': '600', color: '#09090b' },
                },
                {
                  key: 'desc',
                  name: 'Description',
                  tag: 'p',
                  text: 'Short supporting text for this card.',
                  style: { margin: '0', 'font-size': '13px', 'line-height': '1.5', color: '#71717a' },
                },
              ],
            },
          ],
        },
        [
          {
            name: 'Hover',
            kind: 'hover',
            transition: { duration: 300 },
            styles: {
              root: { transform: 'translateY(-4px)', 'box-shadow': '0 12px 32px rgba(0, 0, 0, 0.12)' },
              image: { transform: 'scale(1.05)' },
            },
          },
        ],
      ),
  },
  {
    id: 'input',
    name: 'Input',
    description: 'Focus state on a text field',
    create: () =>
      buildDoc(
        'Input',
        {
          key: 'root',
          name: 'Field',
          tag: 'label',
          style: {
            display: 'flex',
            'flex-direction': 'column',
            gap: '6px',
            width: '280px',
            'font-family': 'Inter, sans-serif',
          },
          children: [
            {
              key: 'label',
              name: 'Label',
              tag: 'span',
              text: 'Email',
              style: { 'font-size': '12px', 'font-weight': '500', color: '#71717a' },
            },
            {
              key: 'input',
              name: 'Input',
              tag: 'input',
              attrs: { type: 'email', placeholder: 'you@example.com' },
              style: {
                padding: '10px 12px',
                border: '1px solid #d4d4d8',
                'border-radius': '8px',
                'background-color': '#ffffff',
                'font-size': '14px',
                outline: 'none',
              },
            },
          ],
        },
        [
          {
            name: 'Focus',
            kind: 'focus',
            trigger: 'input',
            styles: {
              input: { 'border-color': '#2563eb', 'box-shadow': '0 0 0 3px rgba(37, 99, 235, 0.2)' },
              label: { color: '#2563eb' },
            },
          },
        ],
      ),
  },
  {
    id: 'toggle',
    name: 'Toggle',
    description: 'Custom "On" state',
    create: () =>
      buildDoc(
        'Toggle',
        {
          key: 'root',
          name: 'Track',
          tag: 'div',
          style: {
            display: 'flex',
            'align-items': 'center',
            width: '52px',
            height: '32px',
            padding: '4px',
            'border-radius': '999px',
            'background-color': '#d4d4d8',
            cursor: 'pointer',
          },
          children: [
            {
              key: 'knob',
              name: 'Knob',
              tag: 'div',
              style: {
                width: '24px',
                height: '24px',
                'border-radius': '999px',
                'background-color': '#ffffff',
                'box-shadow': '0 1px 3px rgba(0, 0, 0, 0.2)',
              },
            },
          ],
        },
        [
          {
            name: 'On',
            kind: 'custom',
            transition: { duration: 250, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
            styles: {
              root: { 'background-color': '#16a34a' },
              knob: { transform: 'translateX(20px)' },
            },
          },
        ],
      ),
  },
];
