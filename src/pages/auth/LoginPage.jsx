import { useCallback, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { CheckboxField, PasswordField, TextField, fieldId } from '../../components/ui/Field';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useForm } from '../../hooks/useForm';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useRedirectTarget } from '../../layouts/AuthLayout';
import { DEMO_ACCOUNT } from '../../services/authService';
import { USE_MOCK_DATA } from '../../services/api';
import { EMAIL_PATTERN } from '../../utils/validation';

const validate = (values) => {
  const errors = {};
  if (!values.email.trim()) errors.email = 'Enter your email address';
  else if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = 'Enter a valid email, like name@example.com';
  if (!values.password) errors.password = 'Enter your password';
  return errors;
};

export default function LoginPage() {
  useDocumentTitle('Sign in');
  const navigate = useNavigate();
  const { search } = useLocation();
  const redirect = useRedirectTarget();
  const { signIn } = useAuth();
  const { toast } = useToast();
  const form = useForm({ email: '', password: '', remember: true }, validate);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const alertRef = useRef(null);

  const fillDemo = useCallback(() => {
    form.setField('email', DEMO_ACCOUNT.email);
    form.setField('password', DEMO_ACCOUNT.password);
    setFormError('');
  }, [form]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    const errors = form.submit();
    const firstInvalid = Object.keys(errors)[0];
    if (firstInvalid) {
      document.getElementById(fieldId(firstInvalid))?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const user = await signIn(form.values);
      toast({ title: `Welcome back, ${user.firstName}`, description: 'You’re signed in.' });
      navigate(redirect, { replace: true });
    } catch (err) {
      setSubmitting(false);
      setFormError(err.userMessage ?? 'We couldn’t sign you in. Please try again.');
      requestAnimationFrame(() => alertRef.current?.focus());
    }
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-[32px] font-bold leading-tight tracking-tight sm:text-4xl">Welcome back</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">
        Sign in to track orders, see your wishlist and check out faster.
      </p>

      {USE_MOCK_DATA && (
        <Alert tone="info" className="mt-8">
          Demo account: <span className="font-medium">{DEMO_ACCOUNT.email}</span> /{' '}
          <span className="font-medium">{DEMO_ACCOUNT.password}</span>
          <button type="button" onClick={fillDemo} className="ml-2 font-semibold underline underline-offset-4 hover:no-underline">
            Use it
          </button>
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        {formError && (
          <Alert ref={alertRef} title="Sign-in failed">
            {formError}
          </Alert>
        )}
        <fieldset disabled={submitting} className="space-y-5">
          <TextField label="Email" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" {...form.field('email')} />
          <PasswordField
            autoComplete="current-password"
            labelAside={
              <Link to="/forgot-password" className="text-[13px] font-medium text-muted underline-offset-4 hover:text-ink hover:underline">
                Forgot password?
              </Link>
            }
            {...form.field('password')}
          />
          <CheckboxField
            name="remember"
            label="Keep me signed in"
            description="Not recommended on shared devices."
            checked={form.values.remember}
            onChange={(event) => form.setField('remember', event.target.checked)}
          />
        </fieldset>
        <Button type="submit" size="lg" fullWidth loading={submitting} className="!mt-8">
          Sign in
        </Button>
      </form>

      <div className="mt-10 flex items-center gap-4 text-xs text-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        New to NOVA?
        <span className="h-px flex-1 bg-line" />
      </div>
      <Button to={`/register${search}`} variant="secondary" size="lg" fullWidth className="mt-6">
        Create an account
      </Button>
    </div>
  );
}
