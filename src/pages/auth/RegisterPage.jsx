import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { CheckboxField, PasswordField, TextField, fieldId } from '../../components/ui/Field';
import { PasswordStrength, passwordError } from '../../components/auth/PasswordStrength';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useForm } from '../../hooks/useForm';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useRedirectTarget } from '../../layouts/AuthLayout';
import { EMAIL_PATTERN } from '../../utils/validation';

const validate = (values) => {
  const errors = {};
  if (!values.firstName.trim()) errors.firstName = 'Enter your first name';
  if (!values.lastName.trim()) errors.lastName = 'Enter your last name';
  if (!values.email.trim()) errors.email = 'Enter your email address';
  else if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = 'Enter a valid email, like name@example.com';
  const password = passwordError(values.password);
  if (password) errors.password = password;
  if (!values.terms) errors.terms = 'Please accept the terms to create an account';
  return errors;
};

export default function RegisterPage() {
  useDocumentTitle('Create an account');
  const navigate = useNavigate();
  const { search } = useLocation();
  const redirect = useRedirectTarget();
  const { register } = useAuth();
  const { toast } = useToast();
  const form = useForm({ firstName: '', lastName: '', email: '', password: '', marketing: false, terms: false }, validate);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null); // { code, message }
  const alertRef = useRef(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    const errors = form.submit();
    const firstInvalid = Object.keys(errors)[0];
    if (firstInvalid) {
      document.getElementById(fieldId(firstInvalid))?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const user = await register(form.values);
      toast({ title: `Welcome to NOVA, ${user.firstName}`, description: 'Your account is ready.' });
      navigate(redirect, { replace: true });
    } catch (err) {
      setSubmitting(false);
      setFormError({ code: err.code, message: err.userMessage ?? 'We couldn’t create your account. Please try again.' });
      requestAnimationFrame(() => alertRef.current?.focus());
    }
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-title font-bold leading-tight tracking-tight sm:text-4xl">Create your account</h1>
      <p className="mt-3 text-body leading-relaxed text-muted">
        Already a member?{' '}
        <Link to={`/login${search}`} className="font-medium text-ink underline underline-offset-4 hover:no-underline">
          Sign in
        </Link>
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        {formError && (
          <Alert ref={alertRef} title={formError.code === 'email_taken' ? 'You already have an account' : 'Something went wrong'}>
            {formError.message}{' '}
            {formError.code === 'email_taken' && (
              <Link to={`/login${search}`} className="font-semibold underline underline-offset-4">
                Sign in instead
              </Link>
            )}
          </Alert>
        )}
        <fieldset disabled={submitting} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label="First name" autoComplete="given-name" {...form.field('firstName')} />
            <TextField label="Last name" autoComplete="family-name" {...form.field('lastName')} />
          </div>
          <TextField label="Email" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" {...form.field('email')} />
          <PasswordField autoComplete="new-password" {...form.field('password')}>
            <PasswordStrength value={form.values.password} />
          </PasswordField>

          <div className="space-y-4 pt-2">
            <CheckboxField
                name="terms"
                error={form.errors.terms}
                checked={form.values.terms}
                onChange={(event) => form.setField('terms', event.target.checked)}
                label={
                  <>
                    I agree to NOVA’s{' '}
                    <Link to="/legal/terms" className="font-medium underline underline-offset-2">Terms of service</Link> and{' '}
                    <Link to="/legal/privacy" className="font-medium underline underline-offset-2">Privacy policy</Link>
                  </>
                }
              />
            <CheckboxField
              name="marketing"
              label="Send me new arrivals and member-only offers"
              description="Unsubscribe anytime. We never share your details."
              checked={form.values.marketing}
              onChange={(event) => form.setField('marketing', event.target.checked)}
            />
          </div>
        </fieldset>
        <Button type="submit" size="lg" fullWidth loading={submitting} className="!mt-8">
          Create account
        </Button>
      </form>
    </div>
  );
}
