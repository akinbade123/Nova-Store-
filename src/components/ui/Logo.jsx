import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';

export function Logo({ className, inverse = false, ...props }) {
  return (
    <Link
      to="/"
      aria-label="NOVA home"
      className={cn(
        'font-display text-[22px] font-extrabold leading-none tracking-[0.22em]',
        inverse ? 'text-white' : 'text-ink',
        className,
      )}
      {...props}
    >
      NOVA
    </Link>
  );
}
