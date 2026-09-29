import { canHaveChildren, indexInParent, NODE_PRESETS } from '../../model/tree';
import { useEditor } from '../../store/editor';
import type { MenuItem } from '../ui/Menu';

export const INSERT_ITEMS = [
  { key: 'div', label: 'Div' },
  { key: 'text', label: 'Text' },
  { key: 'button', label: 'Button' },
  { key: 'image', label: 'Image' },
  { key: 'input', label: 'Input' },
] as const;

/** Context menu for a layer (layers panel and canvas right-click). */
export function nodeMenuItems(id: string): MenuItem[] {
  const s = useEditor.getState();
  const { doc } = s;
  const node = doc.nodes[id];
  if (!node) return [];
  const isRoot = id === doc.rootId;
  const parent = node.parentId ? doc.nodes[node.parentId] : null;
  const index = indexInParent(doc, id);
  const container = canHaveChildren(node);

  return [
    { label: 'Wrap in div', shortcut: '⌥⌘G', onSelect: () => s.wrap(id) },
    {
      label: 'Unwrap',
      shortcut: '⇧⌘G',
      disabled: !node.children.length || (isRoot && node.children.length !== 1),
      onSelect: () => s.unwrap(id),
    },
    { type: 'separator' },
    {
      label: container ? 'Add child' : 'Add after',
      submenu: INSERT_ITEMS.map((it) => ({
        label: it.label,
        onSelect: () => s.insert(NODE_PRESETS[it.key], id),
      })),
    },
    { label: 'Duplicate', shortcut: '⌘D', disabled: isRoot, onSelect: () => s.duplicate(id) },
    { label: 'Rename', onSelect: () => s.setRenaming(id) },
    { type: 'separator' },
    {
      label: 'Move up',
      shortcut: '⌘[',
      disabled: !parent || index === 0,
      onSelect: () => parent && s.move(id, parent.id, index - 1),
    },
    {
      label: 'Move down',
      shortcut: '⌘]',
      disabled: !parent || index === parent.children.length - 1,
      onSelect: () => parent && s.move(id, parent.id, index + 1),
    },
    { type: 'separator' },
    { label: 'Delete', shortcut: '⌫', danger: true, disabled: isRoot, onSelect: () => s.remove(id) },
  ];
}
