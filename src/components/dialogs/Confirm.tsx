import { create } from 'zustand';
import { Modal } from './Modal';

interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  resolve: (ok: boolean) => void;
}

const useConfirm = create<{ request: ConfirmRequest | null }>(() => ({ request: null }));

/** In-app replacement for window.confirm. */
export function confirmDialog(title: string, message: string, confirmLabel = 'Continue'): Promise<boolean> {
  return new Promise((resolve) => {
    useConfirm.setState({ request: { title, message, confirmLabel, resolve } });
  });
}

export function ConfirmHost() {
  const request = useConfirm((s) => s.request);
  if (!request) return null;
  const done = (ok: boolean) => {
    useConfirm.setState({ request: null });
    request.resolve(ok);
  };
  return (
    <Modal
      title={request.title}
      onClose={() => done(false)}
      width={400}
      footer={
        <>
          <span />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="ui-reset-button ui-button" onClick={() => done(false)}>
              Cancel
            </button>
            <button type="button" className="ui-reset-button ui-button is-primary" autoFocus onClick={() => done(true)}>
              {request.confirmLabel}
            </button>
          </div>
        </>
      }
    >
      <p style={{ margin: 0, lineHeight: '18px' }}>{request.message}</p>
    </Modal>
  );
}
