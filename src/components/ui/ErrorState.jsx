import { CircleAlert, RotateCcw } from 'lucide-react';
import { Button } from './Button';

export function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-2xl bg-surface px-6 py-14 text-center">
      <CircleAlert className="size-7 text-danger" strokeWidth={1.5} aria-hidden="true" />
      <p className="mt-4 font-display text-lg font-semibold">{title}</p>
      {message && <p className="mt-1.5 max-w-sm text-sm text-muted">{message}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-6">
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Try again
        </Button>
      )}
    </div>
  );
}
