import { useEffect, useRef, useState } from 'react';
import { canHaveChildren, isAncestorOrSelf, NODE_PRESETS } from '../../model/tree';
import type { ExpNode } from '../../model/types';
import { useEditor } from '../../store/editor';
import { Icon, type IconName } from '../ui/Icon';
import { Menu, anchorBelow } from '../ui/Menu';
import { INSERT_ITEMS, nodeMenuItems } from './node-menu';
import './layers.css';

type DropZone = 'before' | 'after' | 'inside';

const TAG_ICONS: Partial<Record<ExpNode['tag'], IconName>> = {
  button: 'button',
  img: 'image',
  input: 'input',
  span: 'text',
  p: 'text',
  h1: 'text',
  h2: 'text',
  h3: 'text',
  label: 'text',
  a: 'text',
};

export function LayersPanel() {
  const rootId = useEditor((s) => s.doc.rootId);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [drop, setDrop] = useState<{ id: string; zone: DropZone } | null>(null);
  const [addMenu, setAddMenu] = useState<{ x: number; y: number } | null>(null);
  const dragging = useRef<string | null>(null);

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const onDrop = () => {
    const src = dragging.current;
    dragging.current = null;
    setDrop(null);
    if (!src || !drop) return;
    const { doc, move } = useEditor.getState();
    if (isAncestorOrSelf(doc, src, drop.id)) return;
    if (drop.zone === 'inside') {
      move(src, drop.id, doc.nodes[drop.id].children.length);
      setCollapsed((prev) => {
        const next = new Set(prev);
        next.delete(drop.id);
        return next;
      });
      return;
    }
    const parentId = doc.nodes[drop.id].parentId;
    if (!parentId) return;
    const siblings = doc.nodes[parentId].children.filter((c) => c !== src);
    const index = siblings.indexOf(drop.id) + (drop.zone === 'after' ? 1 : 0);
    move(src, parentId, index);
  };

  return (
    <aside className="layers">
      <header className="sidebar-header">
        <span>Layers</span>
        <button
          type="button"
          className="ui-reset-button sidebar-header__icon"
          title="Add element"
          onClick={(e) => setAddMenu(anchorBelow(e.currentTarget))}
        >
          <Icon name="plus" />
        </button>
      </header>
      <div
        className="layers__tree ui-scroll"
        role="tree"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onDrop();
        }}
        onPointerLeave={() => useEditor.getState().hover(null)}
      >
        <LayerRow
          id={rootId}
          depth={0}
          collapsed={collapsed}
          onToggle={toggle}
          drop={drop}
          onDragStart={(id) => (dragging.current = id)}
          onDragOverRow={(id, zone) => {
            const src = dragging.current;
            const doc = useEditor.getState().doc;
            if (!src || isAncestorOrSelf(doc, src, id)) return setDrop(null);
            setDrop((d) => (d?.id === id && d.zone === zone ? d : { id, zone }));
          }}
          onDragEnd={() => {
            dragging.current = null;
            setDrop(null);
          }}
        />
      </div>
      {addMenu && (
        <Menu
          x={addMenu.x}
          y={addMenu.y}
          onClose={() => setAddMenu(null)}
          items={INSERT_ITEMS.map((it) => ({
            label: it.label,
            onSelect: () => useEditor.getState().insert(NODE_PRESETS[it.key]),
          }))}
        />
      )}
    </aside>
  );
}

interface LayerRowProps {
  id: string;
  depth: number;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  drop: { id: string; zone: DropZone } | null;
  onDragStart: (id: string) => void;
  onDragOverRow: (id: string, zone: DropZone) => void;
  onDragEnd: () => void;
}

function LayerRow(props: LayerRowProps) {
  const { id, depth, collapsed, onToggle, drop } = props;
  const node = useEditor((s) => s.doc.nodes[id]);
  const isRoot = useEditor((s) => s.doc.rootId === id);
  const selected = useEditor((s) => s.selectedId === id);
  const hovered = useEditor((s) => s.hoveredId === id);
  const renaming = useEditor((s) => s.renamingId === id);
  const hasOverride = useEditor((s) =>
    s.activeStateId !== 'default' && !!s.doc.styles[s.activeStateId]?.[id],
  );
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected) rowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  if (!node) return null;
  const isOpen = !collapsed.has(id);
  const container = canHaveChildren(node);
  const dropZone = drop?.id === id ? drop.zone : null;

  return (
    <>
      <div
        ref={rowRef}
        role="treeitem"
        aria-selected={selected}
        aria-expanded={node.children.length ? isOpen : undefined}
        className={[
          'layer-row',
          selected && 'is-selected',
          hovered && 'is-hovered',
          dropZone && `is-drop-${dropZone}`,
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ paddingLeft: 8 + depth * 12 }}
        draggable={!isRoot && !renaming}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', id);
          props.onDragStart(id);
        }}
        onDragEnd={props.onDragEnd}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const r = e.currentTarget.getBoundingClientRect();
          const y = (e.clientY - r.top) / r.height;
          let zone: DropZone;
          if (isRoot) zone = 'inside';
          else if (container) zone = y < 0.25 ? 'before' : y > 0.75 ? 'after' : 'inside';
          else zone = y < 0.5 ? 'before' : 'after';
          props.onDragOverRow(id, zone);
        }}
        onClick={() => useEditor.getState().select(id)}
        onDoubleClick={() => useEditor.getState().setRenaming(id)}
        onPointerEnter={() => useEditor.getState().hover(id)}
        onContextMenu={(e) => {
          e.preventDefault();
          useEditor.getState().select(id);
          setMenu({ x: e.clientX, y: e.clientY });
        }}
      >
        <button
          type="button"
          className={`ui-reset-button layer-row__caret${node.children.length ? '' : ' is-hidden'}`}
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(id);
          }}
        >
          <Icon name={isOpen ? 'chevronDown' : 'chevronRight'} size={12} />
        </button>
        <span className="layer-row__icon">
          <Icon name={TAG_ICONS[node.tag] ?? 'frame'} size={14} />
        </span>
        {renaming ? (
          <RenameInput id={id} initial={node.name} />
        ) : (
          <span className="layer-row__name">{node.name}</span>
        )}
        {hasOverride && <span className="layer-row__dot" title="Changed in this state" />}
        <span className="layer-row__tag">{node.tag}</span>
      </div>
      {isOpen &&
        node.children.map((c) => <LayerRow key={c} {...props} id={c} depth={depth + 1} />)}
      {menu && <Menu x={menu.x} y={menu.y} onClose={() => setMenu(null)} items={nodeMenuItems(id)} />}
    </>
  );
}

function RenameInput({ id, initial }: { id: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const done = (commit: boolean) => {
    const { rename, setRenaming } = useEditor.getState();
    if (commit) rename(id, value);
    setRenaming(null);
  };
  return (
    <input
      className="layer-row__rename"
      autoFocus
      value={value}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => done(true)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') done(true);
        if (e.key === 'Escape') done(false);
      }}
    />
  );
}
