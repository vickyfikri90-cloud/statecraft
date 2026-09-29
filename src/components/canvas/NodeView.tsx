import { createElement, memo } from 'react';
import { nodeClass, stateClass } from '../../model/css';
import { VOID_TAGS, type ComponentDoc } from '../../model/types';

const RENAMED: Record<string, string> = {
  for: 'htmlFor',
  tabindex: 'tabIndex',
  readonly: 'readOnly',
  maxlength: 'maxLength',
  minlength: 'minLength',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
  srcset: 'srcSet',
  crossorigin: 'crossOrigin',
  autocomplete: 'autoComplete',
  enterkeyhint: 'enterKeyHint',
  inputmode: 'inputMode',
  contenteditable: 'contentEditable',
  spellcheck: 'spellCheck',
  value: 'defaultValue',
  checked: 'defaultChecked',
};
const DROPPED = new Set(['autofocus', 'class', 'style', 'id']);

/** Model attributes use HTML names (for export); React wants its own spelling. */
function toReactProps(attrs: Record<string, string> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(attrs ?? {})) {
    if (DROPPED.has(name) || name.startsWith('on')) continue;
    if (name.startsWith('data-') || name.startsWith('aria-')) out[name] = value;
    else if (RENAMED[name]) out[RENAMED[name]] = value;
    else out[name.replace(/[-:]([a-z])/g, (_, c: string) => c.toUpperCase())] = value;
  }
  return out;
}

interface NodeViewProps {
  doc: ComponentDoc;
  id: string;
  /** Extra classes per node (custom states toggled in the live preview). */
  extraClasses?: Record<string, string[]>;
  interactive: boolean;
}

/** Renders the component tree as real DOM so CSS states behave exactly like in export. */
export const NodeView = memo(function NodeView({ doc, id, extraClasses, interactive }: NodeViewProps) {
  const node = doc.nodes[id];
  if (!node) return null;
  const className = [nodeClass(id), ...(extraClasses?.[id] ?? [])].join(' ');
  const props: Record<string, unknown> = {
    ...toReactProps(node.attrs),
    className,
    'data-node-id': id,
  };
  if (node.tag === 'button') props.type = 'button';
  if (node.tag === 'a') props.onClick = (e: React.MouseEvent) => e.preventDefault();
  if (node.tag === 'input') {
    props.readOnly = !interactive;
    props.tabIndex = interactive ? undefined : -1;
  }
  if (node.tag === 'img') props.draggable = false;
  if (!interactive && node.tag === 'button') props.tabIndex = -1;

  if (VOID_TAGS.has(node.tag)) return createElement(node.tag, props);
  if (node.html !== undefined) {
    props.dangerouslySetInnerHTML = { __html: node.html };
    return createElement(node.tag, props);
  }
  const children = node.children.length
    ? node.children.map((c) => (
        <NodeView key={c} doc={doc} id={c} extraClasses={extraClasses} interactive={interactive} />
      ))
    : node.text;
  return createElement(node.tag, props, children);
});

/** Classes to add for custom/disabled states that are switched on in the live preview. */
export function liveStateClasses(doc: ComponentDoc, liveStates: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const state of doc.states) {
    if (!liveStates.includes(state.id)) continue;
    (out[state.triggerId] ??= []).push(stateClass(state));
  }
  return out;
}
