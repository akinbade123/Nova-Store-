import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useUI } from '../../context/UIContext';
import { imageUrl } from '../../utils/image';
import { cn } from '../../utils/cn';

const icons = {
  success: <CircleCheck className="size-5 text-success" strokeWidth={1.75} />,
  error: <CircleAlert className="size-5 text-danger" strokeWidth={1.75} />,
  info: <Info className="size-5 text-accent" strokeWidth={1.75} />,
};

export function Toaster() {
  const { toasts, dismiss } = useToast();
  const { isCartOpen } = useUI();

  // The bag drawer already shows what was added; keep its checkout button clear.
  if (isCartOpen) return null;

  return (
    <div
      data-toaster
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-70 flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end sm:p-6"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.variant === 'error' ? 'alert' : 'status'}
          className="pointer-events-auto flex w-full max-w-95 animate-slide-up items-center gap-3 rounded-2xl bg-white p-3 pr-2 shadow-lift ring-1 ring-line"
        >
          {toast.image ? (
            <img
              src={imageUrl(toast.image, { w: 96, h: 120 })}
              alt=""
              className="h-14 w-11 shrink-0 rounded-lg bg-surface object-cover"
            />
          ) : (
            <span className="ml-1 shrink-0">{icons[toast.variant]}</span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">{toast.title}</p>
            {toast.description && <p className="mt-0.5 truncate text-caption text-muted">{toast.description}</p>}
          </div>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action.onClick();
                dismiss(toast.id);
              }}
              className="shrink-0 rounded-full px-3 py-1.5 text-caption font-semibold text-ink underline-offset-4 hover:underline"
            >
              {toast.action.label}
            </button>
          )}
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            className={cn('inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink')}
            aria-label="Dismiss notification"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
