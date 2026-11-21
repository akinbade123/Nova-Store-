import { Button } from './Button';

export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      {Icon && (
        <span className="flex size-16 items-center justify-center rounded-full bg-surface">
          <Icon className="size-7" strokeWidth={1.5} aria-hidden="true" />
        </span>
      )}
      <p className="mt-5 font-display text-xl font-semibold">{title}</p>
      {message && <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{message}</p>}
      {action && (
        <Button to={action.to} onClick={action.onClick} className="mt-7">
          {action.label}
        </Button>
      )}
    </div>
  );
}
