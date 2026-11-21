import { Sheet } from './Sheet';
import { Button } from './Button';

/** Centred confirmation for destructive or important actions. */
export function ConfirmDialog({ open, onClose, onConfirm, title, children, confirmLabel = 'Confirm', tone = 'danger', loading = false, confirmDisabled = false }) {
  return (
    <Sheet
      open={open}
      onClose={loading ? () => {} : onClose}
      side="center"
      title={title}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} loading={loading} disabled={confirmDisabled} variant={tone === 'danger' ? 'danger' : 'primary'}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="px-5 py-6 text-[15px] leading-relaxed text-ink/75 sm:px-6">{children}</div>
    </Sheet>
  );
}
