import { useId, useState } from 'react';
import { ChevronDown, CircleAlert, Tag, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { formatPrice } from '../../utils/format';
import { cn } from '../../utils/cn';

export function PromoCodeForm() {
  const { promo, applyPromo, removePromo, getTotals } = useCart();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const id = useId();
  const { promoActive, promoShortfall } = getTotals();

  if (promo) {
    return (
      <div className={cn('rounded-xl p-3.5', promoActive ? 'bg-success/[0.07]' : 'bg-sale/[0.07]')}>
        <div className="flex items-center justify-between gap-3">
          <p className="flex min-w-0 items-center gap-2 text-sm">
            <Tag className={cn('size-4 shrink-0', promoActive ? 'text-success' : 'text-sale')} strokeWidth={1.75} aria-hidden="true" />
            <span className="font-semibold tracking-wide">{promo.code}</span>
            <span className="truncate text-muted">{promo.label}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              removePromo();
              toast({ variant: 'info', title: `${promo.code} removed` });
            }}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted hover:bg-white hover:text-ink"
            aria-label={`Remove promo code ${promo.code}`}
          >
            <X className="size-4" />
          </button>
        </div>
        {!promoActive && promoShortfall > 0 && (
          <p className="mt-2 text-xs font-medium text-sale">
            Add {formatPrice(promoShortfall)} more to use this code.
          </p>
        )}
      </div>
    );
  }

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await applyPromo(code);
      setCode('');
      setOpen(false);
      toast({ title: `${result.code} applied`, description: result.label });
    } catch (err) {
      setError(err.userMessage ?? 'We couldn’t apply that code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={id}
        className="flex w-full items-center justify-between py-1 text-sm font-medium"
      >
        <span className="flex items-center gap-2">
          <Tag className="size-4" strokeWidth={1.75} aria-hidden="true" />
          Have a promo code?
        </span>
        <ChevronDown className={cn('size-4 text-muted transition-transform duration-300', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open && (
        <form id={id} onSubmit={submit} noValidate className="mt-3 animate-fade-in">
          <div className="flex gap-2">
            <label className="flex-1">
              <span className="sr-only">Promo code</span>
              <input
                value={code}
                onChange={(event) => {
                  setCode(event.target.value);
                  if (error) setError('');
                }}
                placeholder="Enter code"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${id}-error` : undefined}
                className={cn(
                  'h-11 w-full rounded-full bg-white px-4 text-sm uppercase tracking-wide outline-none ring-1 ring-inset transition-shadow placeholder:normal-case placeholder:tracking-normal placeholder:text-subtle focus:ring-2',
                  error ? 'ring-danger focus:ring-danger' : 'ring-line-strong focus:ring-ink',
                )}
              />
            </label>
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="inline-flex h-11 min-w-[84px] items-center justify-center rounded-full bg-ink px-5 text-sm font-medium text-white transition-colors hover:bg-ink-soft disabled:bg-ink/30"
            >
              {loading ? (
                <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-label="Applying" />
              ) : (
                'Apply'
              )}
            </button>
          </div>
          {error ? (
            <p id={`${id}-error`} role="alert" className="mt-2 flex items-start gap-1.5 text-xs font-medium text-danger">
              <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
              {error}
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted">Try NOVA10, WELCOME15 or FREESHIP.</p>
          )}
        </form>
      )}
    </div>
  );
}
