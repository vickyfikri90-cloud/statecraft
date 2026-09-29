import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './Menu.css';

export type MenuItem =
  | { type: 'separator' }
  | {
      type?: 'item';
      label: string;
      shortcut?: string;
      checked?: boolean;
      disabled?: boolean;
      danger?: boolean;
      onSelect?: () => void;
      submenu?: MenuItem[];
    };

interface MenuProps {
  items: MenuItem[];
  x: number;
  y: number;
  onClose: () => void;
  minWidth?: number;
}

export function Menu({ items, x, y, onClose, minWidth = 160 }: MenuProps) {
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest('.ui-menu')) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    const onBlur = () => onClose();
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('blur', onBlur);
    window.addEventListener('resize', onBlur);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('resize', onBlur);
    };
  }, [onClose]);

  return createPortal(
    <MenuList items={items} x={x} y={y} onClose={onClose} minWidth={minWidth} />,
    document.body,
  );
}

function MenuList({ items, x, y, onClose, minWidth }: MenuProps) {
  const local = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  const [openSub, setOpenSub] = useState<{ index: number; x: number; y: number } | null>(null);

  // Keep the menu inside the viewport.
  useLayoutEffect(() => {
    const el = local.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const nx = Math.min(x, window.innerWidth - r.width - 8);
    const ny = Math.min(y, window.innerHeight - r.height - 8);
    setPos({ x: Math.max(8, nx), y: Math.max(8, ny) });
  }, [x, y]);

  return (
    <div
      ref={local}
      className="ui-menu"
      role="menu"
      style={{ left: pos.x, top: pos.y, minWidth }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, i) => {
        if (item.type === 'separator') return <div key={i} className="ui-menu__sep" />;
        return (
          <button
            key={i}
            type="button"
            role="menuitem"
            className={`ui-reset-button ui-menu__item${item.danger ? ' is-danger' : ''}${openSub?.index === i ? ' is-open' : ''}`}
            disabled={item.disabled}
            onPointerEnter={(e) => {
              if (item.submenu) {
                const r = e.currentTarget.getBoundingClientRect();
                setOpenSub({ index: i, x: r.right + 2, y: r.top - 2 });
              } else setOpenSub(null);
            }}
            onClick={() => {
              if (item.submenu) return;
              onClose();
              item.onSelect?.();
            }}
          >
            <span className="ui-menu__check">{item.checked ? '✓' : ''}</span>
            <span className="ui-menu__label">{item.label}</span>
            {item.shortcut && <span className="ui-menu__shortcut">{item.shortcut}</span>}
            {item.submenu && <span className="ui-menu__shortcut">›</span>}
          </button>
        );
      })}
      {openSub && (
        <MenuList
          items={(items[openSub.index] as { submenu: MenuItem[] }).submenu}
          x={openSub.x}
          y={openSub.y}
          onClose={onClose}
          minWidth={140}
        />
      )}
    </div>
  );
}

/** Open a menu anchored below an element. */
export function anchorBelow(el: HTMLElement): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.bottom + 4 };
}
