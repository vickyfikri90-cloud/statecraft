import { useEffect, useMemo, useRef, useState } from 'react';
import { useEditor } from '../../store/editor';
import { nodeMenuItems } from '../layers/node-menu';
import { Menu } from '../ui/Menu';
import { NodeView, liveStateClasses } from './NodeView';

export const LIVE = 'live';

interface CanvasProps {
  /** A state id (rendered forced into that state) or `live` (real interactions). */
  stateId: string;
}

export function Canvas({ stateId }: CanvasProps) {
  const doc = useEditor((s) => s.doc);
  const selectMode = useEditor((s) => s.selectMode);
  const liveStates = useEditor((s) => s.liveStates);
  const isLive = stateId === LIVE;
  const canSelect = !isLive || selectMode;

  const rootRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const extraClasses = useMemo(
    () => (isLive ? liveStateClasses(doc, liveStates) : undefined),
    [doc, isLive, liveStates],
  );

  const nodeAt = (target: EventTarget | null): string | null => {
    const el = (target as HTMLElement | null)?.closest?.('[data-node-id]');
    return el && rootRef.current?.contains(el) ? el.getAttribute('data-node-id') : null;
  };

  const onClickCapture = (e: React.MouseEvent) => {
    const { select, setActiveState, doc: current, toggleLiveState } = useEditor.getState();
    const id = nodeAt(e.target);
    if (canSelect) {
      e.preventDefault();
      e.stopPropagation();
      select(id);
      if (!isLive) setActiveState(stateId);
      return;
    }
    // Live preview: clicking a custom state's trigger toggles that state.
    if (!id) return;
    for (const state of current.states) {
      if (state.kind !== 'custom' && state.kind !== 'disabled') continue;
      const trigger = rootRef.current?.querySelector(`[data-node-id="${state.triggerId}"]`);
      if (trigger?.contains(e.target as Node)) toggleLiveState(state.id);
    }
  };

  return (
    <div
      ref={rootRef}
      className={`sc-canvas${canSelect ? ' is-selecting' : ''}`}
      data-state={stateId}
      style={{ background: doc.canvas.background }}
      onClickCapture={onClickCapture}
      onPointerDownCapture={(e) => {
        // Keep inputs from focusing / buttons from pressing while inspecting.
        if (canSelect) e.preventDefault();
      }}
      onPointerMove={(e) => canSelect && useEditor.getState().hover(nodeAt(e.target))}
      onPointerLeave={() => canSelect && useEditor.getState().hover(null)}
      onContextMenu={(e) => {
        const id = nodeAt(e.target);
        if (!id) return;
        e.preventDefault();
        const { select, setActiveState } = useEditor.getState();
        select(id);
        if (!isLive) setActiveState(stateId);
        setMenu({ id, x: e.clientX, y: e.clientY });
      }}
    >
      <div className="sc-canvas__stage">
        <NodeView doc={doc} id={doc.rootId} extraClasses={extraClasses} interactive={isLive && !selectMode} />
      </div>
      <SelectionOverlay rootRef={rootRef} />
      {menu && <Menu x={menu.x} y={menu.y} onClose={() => setMenu(null)} items={nodeMenuItems(menu.id)} />}
    </div>
  );
}

/**
 * Outlines for the hovered and selected node. Positions are read every frame
 * so they follow transitions; DOM is written directly to avoid re-renders.
 */
function SelectionOverlay({ rootRef }: { rootRef: React.RefObject<HTMLDivElement | null> }) {
  const hoverRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const place = (box: HTMLDivElement | null, id: string | null) => {
      if (!box) return null;
      const root = rootRef.current;
      const el = id && root ? root.querySelector<HTMLElement>(`[data-node-id="${id}"]`) : null;
      if (!el || !root) {
        box.style.display = 'none';
        return null;
      }
      const rr = root.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      box.style.display = 'block';
      box.style.transform = `translate(${r.left - rr.left}px, ${r.top - rr.top}px)`;
      box.style.width = `${r.width}px`;
      box.style.height = `${r.height}px`;
      return r;
    };
    const tick = () => {
      const { selectedId, hoveredId, doc } = useEditor.getState();
      place(hoverRef.current, hoveredId !== selectedId ? hoveredId : null);
      const r = place(selectRef.current, selectedId);
      if (labelRef.current && r && selectedId) {
        const text = `${doc.nodes[selectedId]?.name ?? ''}  ${Math.round(r.width)} × ${Math.round(r.height)}`;
        if (labelRef.current.textContent !== text) labelRef.current.textContent = text;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [rootRef]);

  return (
    <div className="sc-overlay" aria-hidden>
      <div ref={hoverRef} className="sc-overlay__box is-hover" />
      <div ref={selectRef} className="sc-overlay__box is-selected">
        <div ref={labelRef} className="sc-overlay__label" />
      </div>
    </div>
  );
}
