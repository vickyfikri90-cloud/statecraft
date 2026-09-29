import { useCallback, useEffect, useState } from 'react';
import { Workspace } from './components/canvas/Workspace';
import { CodeDialog } from './components/dialogs/CodeDialog';
import { ConfirmHost } from './components/dialogs/Confirm';
import { NewComponentDialog } from './components/dialogs/NewComponentDialog';
import { Inspector } from './components/inspector/Inspector';
import { LayersPanel } from './components/layers/LayersPanel';
import { TopBar } from './components/topbar/TopBar';
import { useShortcuts } from './hooks/useShortcuts';
import type { Template } from './model/templates';
import { useEditor } from './store/editor';
import { newFromTemplate } from './store/file-actions';
import './components/ui/controls.css';

type Dialog = 'new' | 'code' | null;

export function App({ firstRun }: { firstRun: boolean }) {
  const [dialog, setDialog] = useState<Dialog>(firstRun ? 'new' : null);
  const openNew = useCallback(() => setDialog('new'), []);
  const openCode = useCallback(() => setDialog('code'), []);
  const close = useCallback(() => setDialog(null), []);
  useShortcuts({ onNew: openNew, onShowCode: openCode });

  const pickTemplate = (t: Template) => {
    close();
    void newFromTemplate(t);
  };

  return (
    <div className="app">
      <TopBar onNew={openNew} onShowCode={openCode} />
      <div className="app__body">
        <LayersPanel />
        <Workspace />
        <Inspector />
      </div>
      {dialog === 'new' && <NewComponentDialog onPick={pickTemplate} onClose={close} />}
      {dialog === 'code' && <CodeDialog onClose={close} />}
      <ConfirmHost />
      <Toast />
    </div>
  );
}

function Toast() {
  const toast = useEditor((s) => s.toast);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2200);
    return () => clearTimeout(t);
  }, [toast]);
  if (!toast || !visible) return null;
  return (
    <div key={toast.id} className={`toast${toast.tone === 'error' ? ' is-error' : ''}`} role="status">
      {toast.message}
    </div>
  );
}
