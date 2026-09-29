import { useMemo, useState } from 'react';
import { buildExportCss, buildExportDocument, buildExportHtml } from '../../model/css';
import { useEditor } from '../../store/editor';
import { exportHtml } from '../../store/file-actions';
import { Segmented } from '../ui/controls';
import { Modal } from './Modal';

type Tab = 'html' | 'css' | 'document';

export function CodeDialog({ onClose }: { onClose: () => void }) {
  const doc = useEditor((s) => s.doc);
  const notify = useEditor((s) => s.notify);
  const [tab, setTab] = useState<Tab>('css');
  const code = useMemo(() => {
    if (tab === 'html') return buildExportHtml(doc);
    if (tab === 'css') return buildExportCss(doc);
    return buildExportDocument(doc);
  }, [doc, tab]);

  return (
    <Modal
      title="Code"
      onClose={onClose}
      width={720}
      footer={
        <>
          <div style={{ width: 240 }}>
            <Segmented
              value={tab}
              onChange={(v) => v && setTab(v as Tab)}
              options={[
                { value: 'html', label: 'HTML' },
                { value: 'css', label: 'CSS' },
                { value: 'document', label: 'Full page' },
              ]}
            />
          </div>
          <span style={{ flex: 1 }} />
          <button type="button" className="ui-reset-button ui-button" onClick={exportHtml}>
            Download .html
          </button>
          <button
            type="button"
            className="ui-reset-button ui-button is-primary"
            onClick={async () => {
              await navigator.clipboard.writeText(code);
              notify('Copied to clipboard');
            }}
          >
            Copy
          </button>
        </>
      }
    >
      <pre className="code-view ui-scroll">{code}</pre>
    </Modal>
  );
}
