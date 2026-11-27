import { cn } from '../../utils/cn';

/** An on/off switch with a label and description. A real checkbox underneath, announced as a switch. */
export function Toggle({ label, description, checked, onChange, disabled }) {
  return (
    <label className={cn('flex cursor-pointer items-start justify-between gap-6 py-4', disabled && 'cursor-wait opacity-60')}>
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-0.5 block text-caption text-muted">{description}</span>
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={onChange} disabled={disabled} className="peer sr-only" />
      <span
        aria-hidden="true"
        className={cn(
          'relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition-colors duration-200',
          'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
          checked ? 'bg-ink' : 'bg-line-strong',
        )}
      >
        <span className={cn('absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out-soft', checked && 'translate-x-4')} />
      </span>
    </label>
  );
}
