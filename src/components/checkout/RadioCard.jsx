import { cn } from '../../utils/cn';

/** Selectable card backed by a native radio input (keyboard arrows work as expected). */
export function RadioCard({ name, value, checked, onChange, title, description, aside, children, className }) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-white ring-1 ring-inset transition-[box-shadow,background-color] duration-200',
        checked ? 'ring-2 ring-ink' : 'ring-line-strong hover:ring-subtle',
        className,
      )}
    >
      <label className="flex cursor-pointer items-center gap-4 p-4 sm:px-5">
        <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="peer sr-only" />
        <span
          aria-hidden="true"
          className={cn(
            'flex size-5 shrink-0 items-center justify-center rounded-full ring-1 ring-inset transition-all',
            'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
            checked ? 'ring-[6px] ring-ink' : 'ring-line-strong',
          )}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-medium">{title}</span>
          {description && <span className="mt-0.5 block text-[13px] text-muted">{description}</span>}
        </span>
        {aside && <span className="shrink-0 text-sm font-medium">{aside}</span>}
      </label>
      {checked && children && <div className="animate-fade-in border-t border-line px-4 pb-5 pt-5 sm:px-5">{children}</div>}
    </div>
  );
}
