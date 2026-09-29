/** CSS declarations keyed by kebab-case property name, e.g. `{ 'padding-top': '12px' }`. */
export type StyleMap = Record<string, string>;

/** Any HTML tag name (lowercase). Imported documents can use tags beyond the built-in presets. */
export type NodeTag = string;

/** Elements that never have children. */
export const VOID_TAGS = new Set(['img', 'input', 'br', 'hr', 'area', 'col', 'embed', 'source', 'track', 'wbr']);

export interface ExpNode {
  id: string;
  name: string;
  tag: NodeTag;
  /** Text content. Only rendered for nodes without children. */
  text?: string;
  /** Raw inner markup kept verbatim (inline SVG). Such nodes are leaves. */
  html?: string;
  /** Element attributes (src, alt, placeholder, href…). */
  attrs?: Record<string, string>;
  parentId: string | null;
  children: string[];
}

export type StateKind =
  | 'default'
  | 'hover'
  | 'active'
  | 'focus'
  | 'focus-visible'
  | 'disabled'
  | 'custom';

export interface Transition {
  /** ms */
  duration: number;
  /** ms */
  delay: number;
  easing: string;
  /** CSS transition-property value. */
  property: string;
}

export interface ExpState {
  id: string;
  name: string;
  kind: StateKind;
  /** Node whose interaction activates the state. Defaults to the root. */
  triggerId: string;
  /** Timing used when entering this state (for `default`: when returning to it). */
  transition: Transition;
}

export interface ComponentDoc {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  canvas: { background: string };
  rootId: string;
  nodes: Record<string, ExpNode>;
  /** `states[0]` is always the default state. */
  states: ExpState[];
  /** stateId → nodeId → declarations. Non-default states store overrides only. */
  styles: Record<string, Record<string, StyleMap>>;
}

export const DEFAULT_STATE_ID = 'default';
