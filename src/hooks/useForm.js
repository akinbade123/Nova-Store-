import { useCallback, useMemo, useState } from 'react';

/**
 * Minimal form state with validation.
 * `validate(values)` returns { fieldName: message }. Errors show once a field
 * has been blurred, or for every field after the first submit attempt.
 */
export function useForm(initialValues, validate) {
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const allErrors = useMemo(() => validate(values), [values, validate]);
  const errors = useMemo(
    () => Object.fromEntries(Object.entries(allErrors).filter(([name]) => submitted || touched[name])),
    [allErrors, submitted, touched],
  );

  const setField = useCallback((name, value) => setValues((current) => ({ ...current, [name]: value })), []);
  const touch = useCallback((name) => setTouched((current) => (current[name] ? current : { ...current, [name]: true })), []);

  /** Spread onto an input: value, onChange, onBlur and the visible error. */
  const field = (name, { format } = {}) => ({
    name,
    value: values[name] ?? '',
    error: errors[name],
    onChange: (event) => {
      const { type, checked, value } = event.target;
      const next = type === 'checkbox' ? checked : value;
      setField(name, format ? format(next, values[name] ?? '') : next);
    },
    onBlur: () => touch(name),
  });

  /** Marks the form as submitted and returns all current errors. */
  const submit = useCallback(() => {
    setSubmitted(true);
    return allErrors;
  }, [allErrors]);

  return { values, setField, field, errors, allErrors, submit, submitted };
}
