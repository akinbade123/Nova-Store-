import { forwardRef, useState } from 'react';
import { Check, ChevronDown, CircleAlert, Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils/cn';

/** DOM id for a form field. The checkout error summary links to these. */
export const fieldId = (name) => `field-${name}`;

const controlClass = (error) =>
  cn(
    'h-12 w-full rounded-xl bg-white px-4 text-[15px] text-ink outline-none ring-1 ring-inset transition-shadow duration-150 placeholder:text-subtle',
    'focus:ring-2 disabled:bg-surface disabled:text-muted',
    error ? 'ring-danger focus:ring-danger' : 'ring-line-strong hover:ring-subtle focus:ring-ink',
  );

function FieldShell({ name, label, optional, error, hint, labelAside, className, children }) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={fieldId(name)} className="flex flex-1 items-baseline justify-between gap-2 text-[13px] font-medium">
          {label}
          {optional && <span className="text-xs font-normal text-muted">Optional</span>}
        </label>
        {labelAside}
      </div>
      {children}
      {error ? (
        <p id={`${fieldId(name)}-error`} className="mt-1.5 flex items-start gap-1.5 text-[12.5px] font-medium text-danger">
          <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${fieldId(name)}-hint`} className="mt-1.5 text-xs text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

const describedBy = (name, error, hint) =>
  error ? `${fieldId(name)}-error` : hint ? `${fieldId(name)}-hint` : undefined;

export const TextField = forwardRef(function TextField(
  { name, label, optional, error, hint, className, suffix, inputClassName, ...inputProps },
  ref,
) {
  return (
    <FieldShell name={name} label={label} optional={optional} error={error} hint={hint} className={className}>
      <div className="relative">
        <input
          ref={ref}
          id={fieldId(name)}
          name={name}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(name, error, hint)}
          aria-required={!optional || undefined}
          className={cn(controlClass(error), suffix && 'pr-14', inputClassName)}
          {...inputProps}
        />
        {suffix && <div className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center">{suffix}</div>}
      </div>
    </FieldShell>
  );
});

/** Password input with a show/hide toggle. */
export const PasswordField = forwardRef(function PasswordField(
  { name, label = 'Password', error, hint, labelAside, className, children, ...inputProps },
  ref,
) {
  const [visible, setVisible] = useState(false);
  return (
    <FieldShell name={name} label={label} error={error} hint={hint} labelAside={labelAside} className={className}>
      <div className="relative">
        <input
          ref={ref}
          id={fieldId(name)}
          name={name}
          type={visible ? 'text' : 'password'}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(name, error, hint)}
          aria-required
          autoCapitalize="none"
          spellCheck={false}
          className={cn(controlClass(error), 'pr-14')}
          {...inputProps}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          aria-controls={fieldId(name)}
          className="absolute inset-y-1.5 right-1.5 inline-flex w-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-ink"
        >
          {visible ? <EyeOff className="size-[18px]" strokeWidth={1.75} /> : <Eye className="size-[18px]" strokeWidth={1.75} />}
        </button>
      </div>
      {children}
    </FieldShell>
  );
});

export function SelectField({ name, label, optional, error, hint, className, children, ...selectProps }) {
  return (
    <FieldShell name={name} label={label} optional={optional} error={error} hint={hint} className={className}>
      <div className="relative">
        <select
          id={fieldId(name)}
          name={name}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(name, error, hint)}
          className={cn(controlClass(error), 'cursor-pointer appearance-none pr-10')}
          {...selectProps}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
      </div>
    </FieldShell>
  );
}

export function CheckboxField({ name, label, description, checked, onChange, error, className }) {
  const errorId = `${fieldId(name)}-error`;
  return (
    <div className={className}>
      <label className="group flex cursor-pointer items-start gap-3">
        <input
          id={fieldId(name)}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={cn(
            'mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-[5px] ring-1 ring-inset transition-colors',
            'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
            checked ? 'bg-ink ring-ink' : error ? 'bg-white ring-danger' : 'bg-white ring-line-strong group-hover:ring-ink',
          )}
        >
          {checked && <Check className="size-3 text-white" strokeWidth={3} />}
        </span>
        <span className="text-sm">
          {label}
          {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
        </span>
      </label>
      {error && (
        <p id={errorId} className="ml-[30px] mt-1.5 flex items-start gap-1.5 text-[12.5px] font-medium text-danger">
          <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
