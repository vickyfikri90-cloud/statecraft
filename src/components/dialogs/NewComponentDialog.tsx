import { useMemo } from 'react';
import { buildEditorCss } from '../../model/css';
import { TEMPLATES, type Template } from '../../model/templates';
import { DEFAULT_STATE_ID } from '../../model/types';
import { importHtmlFile, openComponent } from '../../store/file-actions';
import { NodeView } from '../canvas/NodeView';
import { Icon } from '../ui/Icon';
import { Modal } from './Modal';

interface Props {
  onPick: (template: Template) => void;
  onClose: () => void;
}

export function NewComponentDialog({ onPick, onClose }: Props) {
  // One sample doc per template, rendered live as the thumbnail.
  const samples = useMemo(() => TEMPLATES.map((t) => ({ template: t, doc: t.create() })), []);
  const css = useMemo(() => samples.map((s) => buildEditorCss(s.doc)).join('\n'), [samples]);

  return (
    <Modal
      title="New component"
      onClose={onClose}
      width={720}
      footer={
        <>
          <span className="ui-muted">Start from a template, open a .statecraft file, or import HTML.</span>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            className="ui-reset-button ui-button"
            onClick={() => {
              onClose();
              importHtmlFile();
            }}
          >
            <Icon name="code" size={14} />
            Import HTML…
          </button>
          <button
            type="button"
            className="ui-reset-button ui-button"
            onClick={() => {
              onClose();
              openComponent();
            }}
          >
            <Icon name="file" size={14} />
            Open file…
          </button>
        </>
      }
    >
      <style>{css}</style>
      <div className="template-grid">
        {samples.map(({ template, doc }) => (
          <div
            key={template.id}
            role="button"
            tabIndex={0}
            className="template-card"
            onClick={() => onPick(template)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onPick(template)}
          >
            <div className="template-card__thumb sc-canvas" data-state={DEFAULT_STATE_ID} style={{ background: doc.canvas.background }}>
              <div className="template-card__scale">
                <NodeView doc={doc} id={doc.rootId} interactive={false} />
              </div>
            </div>
            <div className="template-card__meta">
              <span className="template-card__name">{template.name}</span>
              <span className="ui-muted">{template.description}</span>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
