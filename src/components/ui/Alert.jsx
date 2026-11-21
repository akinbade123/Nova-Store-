import { forwardRef } from 'react';
import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import { cn } from '../../utils/cn';

const tones = {
  error: { Icon: CircleAlert, box: 'bg-danger/[0.05] text-danger ring-danger/25' },
  success: { Icon: CircleCheck, box: 'bg-success/[0.06] text-success ring-success/25' },
  info: { Icon: Info, box: 'bg-surface text-ink ring-line-strong' },
};

/** Form-level message. Errors are announced immediately (role="alert"). */
export const Alert = forwardRef(function Alert({ tone = 'error', title, children, className }, ref) {
  const { Icon, box } = tones[tone];
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-2xl p-4 text-sm ring-1 ring-inset outline-none', box, className)}
    >
      <Icon className="mt-px size-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5', tone !== 'info' && 'opacity-90')}>{children}</div>}
      </div>
    </div>
  );
});
