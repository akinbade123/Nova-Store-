import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '../../utils/cn';

export function SectionHeader({ eyebrow, title, description, action, actions, id, className }) {
  return (
    <div className={cn('mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="max-w-2xl">
        {eyebrow && <p className="mb-3 eyebrow text-muted">{eyebrow}</p>}
        <h2 id={id} className="text-heading font-semibold leading-[1.1] sm:text-4xl">
          {title}
        </h2>
        {description && <p className="mt-3 text-body leading-relaxed text-muted">{description}</p>}
      </div>
      {(action || actions) && (
        <div className="flex shrink-0 items-center gap-3">
          {action && (
            <Link
              to={action.to}
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-ink underline-offset-4 hover:underline"
            >
              {action.label}
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          )}
          {actions}
        </div>
      )}
    </div>
  );
}
