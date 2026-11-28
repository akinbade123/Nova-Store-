import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';

/** Square icon control with an optional count badge. `label` is required for accessibility. */
export const IconButton = forwardRef(function IconButton({ to, label, count, className, children, ...props }, ref) {
  const classes = cn(
    'relative inline-flex size-10 items-center justify-center rounded-md text-ink transition-colors duration-200 hover:bg-surface',
    className,
  );
  const badge =
    count > 0 ? (
      <span
        key={count}
        className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] animate-fade-in items-center justify-center rounded-full bg-ink px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white"
        aria-hidden="true"
      >
        {count > 99 ? '99+' : count}
      </span>
    ) : null;
  const fullLabel = count > 0 ? `${label}, ${count} item${count === 1 ? '' : 's'}` : label;

  if (to) {
    return (
      <Link ref={ref} to={to} aria-label={fullLabel} className={classes} {...props}>
        {children}
        {badge}
      </Link>
    );
  }
  return (
    <button ref={ref} type="button" aria-label={fullLabel} className={classes} {...props}>
      {children}
      {badge}
    </button>
  );
});
