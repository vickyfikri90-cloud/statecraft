import { useEffect } from 'react';
import { indexInParent } from '../model/tree';
import { useEditor } from '../store/editor';
import { importHtmlFile, openComponent, saveComponent } from '../store/file-actions';

interface Handlers {
  onNew: () => void;
  onShowCode: () => void;
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

export function useShortcuts({ onNew, onShowCode }: Handlers) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useEditor.getState();
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      const typing = isTyping(e.target);

      // File shortcuts work everywhere, even while typing.
      if (mod && key === 's') {
        e.preventDefault();
        (document.activeElement as HTMLElement | null)?.blur?.();
        void saveComponent({ saveAs: e.shiftKey });
        return;
      }
      if (mod && key === 'o') {
        e.preventDefault();
        void (e.shiftKey ? importHtmlFile() : openComponent());
        return;
      }
      if (mod && key === 'e') {
        e.preventDefault();
        onShowCode();
        return;
      }
      if (e.altKey && e.code === 'KeyN') {
        e.preventDefault();
        onNew();
        return;
      }
      if (typing) return;

      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
        return;
      }
      if (mod && key === 'y') {
        e.preventDefault();
        s.redo();
        return;
      }

      const id = s.selectedId;
      if (!mod && key === 'v') {
        s.setSelectMode(!s.selectMode);
        return;
      }
      if (key === 'escape') {
        if (s.selectMode) s.setSelectMode(false);
        else s.select(null);
        return;
      }
      if (!id || !s.doc.nodes[id]) return;
      const node = s.doc.nodes[id];

      if (key === 'backspace' || key === 'delete') {
        e.preventDefault();
        s.remove(id);
      } else if (mod && key === 'd') {
        e.preventDefault();
        s.duplicate(id);
      } else if (mod && e.code === 'KeyG') {
        e.preventDefault();
        if (e.shiftKey) s.unwrap(id);
        else s.wrap(id);
      } else if (mod && (key === '[' || key === ']') && node.parentId) {
        e.preventDefault();
        const index = indexInParent(s.doc, id);
        const siblings = s.doc.nodes[node.parentId].children;
        const next = key === '[' ? index - 1 : index + 1;
        if (next >= 0 && next < siblings.length) s.move(id, node.parentId, next);
      } else if (key === 'enter' && e.shiftKey) {
        if (node.parentId) s.select(node.parentId);
      } else if (key === 'enter' && node.children.length) {
        e.preventDefault();
        s.select(node.children[0]);
      } else if (key === 'f2') {
        s.setRenaming(id);
      } else if (key === 'arrowup' || key === 'arrowdown') {
        e.preventDefault();
        const order: string[] = [];
        const visit = (nid: string) => {
          order.push(nid);
          s.doc.nodes[nid].children.forEach(visit);
        };
        visit(s.doc.rootId);
        const i = order.indexOf(id) + (key === 'arrowup' ? -1 : 1);
        if (i >= 0 && i < order.length) s.select(order[i]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onNew, onShowCode]);
}
