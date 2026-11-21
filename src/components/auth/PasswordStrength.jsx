import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';

export const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (value) => value.length >= 8 },
  { id: 'letter', label: 'Upper and lowercase letters', test: (value) => /[a-z]/.test(value) && /[A-Z]/.test(value) },
  { id: 'number', label: 'At least one number', test: (value) => /\d/.test(value) },
];

export function passwordError(value) {
  if (!value) return 'Create a password';
  const failed = PASSWORD_RULES.find((rule) => !rule.test(value));
  return failed ? `Password needs: ${failed.label.toLowerCase()}` : null;
}

function score(value) {
  if (!value) return 0;
  let points = PASSWORD_RULES.filter((rule) => rule.test(value)).length;
  if (value.length >= 12) points += 1;
  if (/[^A-Za-z0-9]/.test(value)) points += 1;
  return Math.min(4, Math.max(1, points - 1));
}

const LEVELS = [
  null,
  { label: 'Weak', bar: 'bg-danger', text: 'text-danger' },
  { label: 'Fair', bar: 'bg-sale', text: 'text-sale' },
  { label: 'Good', bar: 'bg-accent', text: 'text-accent' },
  { label: 'Strong', bar: 'bg-success', text: 'text-success' },
];

export function PasswordStrength({ value }) {
  const level = score(value);
  const meta = LEVELS[level];

  return (
    <div className="mt-3" aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="grid flex-1 grid-cols-4 gap-1.5" aria-hidden="true">
          {[1, 2, 3, 4].map((step) => (
            <span key={step} className={cn('h-1 rounded-full transition-colors duration-300', step <= level && meta ? meta.bar : 'bg-line')} />
          ))}
        </div>
        <span className={cn('w-12 text-right text-xs font-medium', meta?.text ?? 'text-subtle')}>
          {meta ? meta.label : ''}
          {meta && <span className="sr-only"> password</span>}
        </span>
      </div>
      <ul className="mt-3 space-y-1.5">
        {PASSWORD_RULES.map((rule) => {
          const met = rule.test(value);
          return (
            <li key={rule.id} className={cn('flex items-center gap-2 text-xs transition-colors', met ? 'text-success' : 'text-muted')}>
              <span
                className={cn(
                  'flex size-4 items-center justify-center rounded-full transition-colors',
                  met ? 'bg-success text-white' : 'ring-1 ring-inset ring-line-strong',
                )}
                aria-hidden="true"
              >
                {met && <Check className="size-2.5" strokeWidth={3.5} />}
              </span>
              {rule.label}
              <span className="sr-only">{met ? ' — met' : ' — not yet met'}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
