import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import { useEscapeKey } from '../../hooks/useEscapeKey';

/**
 * Accessible slide-over panel (cart, mobile menu, filters).
 * Traps focus, restores it on close, and closes on Escape / backdrop click.
 */
export function Sheet({ open, onClose, side = 'right', title, label, headerExtra, footer, className, children }) {
  const panelRef = useRef(null);
  const returnFocusRef = useRef(null);

  useLockBodyScroll(open);
  useEscapeKey(open, onClose);

  useEffect(() => {
    if (!open) return undefined;
    returnFocusRef.current = document.activeElement;
    const panel = panelRef.current;
    const focusables = () =>
      panel.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])');
    requestAnimationFrame(() => (focusables()[0] ?? panel).focus());

    const trap = (event) => {
      if (event.key !== 'Tab') return;
      const nodes = focusables();
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener('keydown', trap);
    return () => {
      panel.removeEventListener('keydown', trap);
      returnFocusRef.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className={cn('fixed inset-0 z-[60]', side === 'center' && 'flex items-end justify-center sm:items-center sm:p-6')}>
      <div className="absolute inset-0 animate-fade-in bg-ink/30 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label ?? (typeof title === 'string' ? title : undefined)}
        tabIndex={-1}
        className={cn(
          'flex w-full flex-col bg-white shadow-lift outline-none',
          side === 'center'
            ? 'relative max-h-[92dvh] max-w-lg animate-slide-up overflow-hidden rounded-t-3xl sm:rounded-3xl'
            : cn('absolute inset-y-0 max-w-[440px]', side === 'right' ? 'right-0 animate-slide-in-right' : 'left-0 animate-slide-in-left'),
          className,
        )}
      >
        {title !== undefined && (
          <div className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-line px-5 sm:px-6">
            <div className="flex items-center gap-2">
              {typeof title === 'string' ? <h2 className="text-lg font-semibold">{title}</h2> : title}
              {headerExtra}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="-mr-2 inline-flex size-10 items-center justify-center rounded-md transition-colors hover:bg-surface"
              aria-label="Close"
            >
              <X className="size-5" strokeWidth={1.75} />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && <div className="shrink-0 border-t border-line bg-white px-5 py-5 sm:px-6">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
