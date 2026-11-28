import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';

const variants = {
  primary: 'bg-ink text-white hover:bg-ink-soft active:bg-black disabled:bg-ink/40',
  accent: 'bg-accent text-white hover:bg-accent-hover disabled:bg-accent/40',
  secondary: 'bg-white text-ink ring-1 ring-inset ring-line-strong hover:ring-ink disabled:text-subtle',
  inverse: 'bg-white text-ink hover:bg-white/90',
  'outline-inverse': 'text-white ring-1 ring-inset ring-white/50 hover:bg-white hover:text-ink',
  ghost: 'text-ink hover:bg-surface',
  danger: 'bg-danger text-white hover:bg-danger/90 disabled:bg-danger/40',
  'danger-outline': 'text-danger ring-1 ring-inset ring-danger/40 hover:bg-danger hover:text-white hover:ring-danger',
};

const sizes = {
  sm: 'h-9 px-4 text-[13px] gap-1.5',
  md: 'h-11 px-6 text-sm gap-2',
  lg: 'h-13 px-8 text-[15px] gap-2',
};

/**
 * Button (rounded-md). Renders a <Link> when `to` is supplied, otherwise a <button>.
 */
export const Button = forwardRef(function Button(
  { to, variant = 'primary', size = 'md', loading = false, fullWidth = false, className, children, disabled, ...props },
  ref,
) {
  const classes = cn(
    'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-md font-medium tracking-[-0.005em]',
    'transition-[background-color,color,box-shadow,transform] duration-200 ease-out active:scale-[0.98] disabled:pointer-events-none',
    variants[variant],
    sizes[size],
    fullWidth && 'w-full',
    className,
  );

  const content = loading ? (
    <>
      <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
      <span className="sr-only">Loading</span>
    </>
  ) : (
    children
  );

  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} {...props}>
        {content}
      </Link>
    );
  }

  return (
    <button ref={ref} type="button" className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {content}
    </button>
  );
});
