import { useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { PasswordField, fieldId } from '../../components/ui/Field';
import { PasswordStrength, passwordError } from '../../components/auth/PasswordStrength';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useForm } from '../../hooks/useForm';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const validate = (values) => {
  const errors = {};
  const password = passwordError(values.password);
  if (password) errors.password = password;
  if (!values.confirm) errors.confirm = 'Enter the new password again';
  else if (values.confirm !== values.password) errors.confirm = 'The passwords don’t match';
  return errors;
};

function BackToSignIn() {
  return (
    <Link to="/login" className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline">
      <ArrowLeft className="size-4" aria-hidden="true" />
      Back to sign in
    </Link>
  );
}

/** Landing page for the link in the password-reset email: /reset-password?token=… */
export default function ResetPasswordPage() {
  useDocumentTitle('Choose a new password');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token');
  const { resetPassword } = useAuth();
  const { toast } = useToast();
  const form = useForm({ password: '', confirm: '' }, validate);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null); // { code, message }
  const alertRef = useRef(null);

  if (!token) {
    return (
      <div className="animate-fade-in">
        <h1 className="text-[32px] font-bold leading-tight tracking-tight sm:text-4xl">This link is incomplete</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Open the link from your reset email again, or request a new one.
        </p>
        <Button to="/forgot-password" size="lg" fullWidth className="mt-8">
          Request a new link
        </Button>
        <BackToSignIn />
      </div>
    );
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    const firstInvalid = Object.keys(form.submit())[0];
    if (firstInvalid) {
      document.getElementById(fieldId(firstInvalid))?.focus();
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword({ token, password: form.values.password });
      toast({ title: 'Password updated', description: 'Sign in with your new password.' });
      navigate('/login', { replace: true });
    } catch (err) {
      setSubmitting(false);
      setFormError({ code: err.code, message: err.userMessage ?? 'We couldn’t update your password. Please try again.' });
      requestAnimationFrame(() => alertRef.current?.focus());
    }
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-[32px] font-bold leading-tight tracking-tight sm:text-4xl">Choose a new password</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">Pick a password you don’t use anywhere else.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        {formError && (
          <Alert ref={alertRef} title={formError.code === 'invalid_token' ? 'This link has expired' : 'Something went wrong'}>
            {formError.message}{' '}
            {formError.code === 'invalid_token' && (
              <Link to="/forgot-password" className="font-semibold underline underline-offset-4">
                Request a new link
              </Link>
            )}
          </Alert>
        )}
        <fieldset disabled={submitting} className="space-y-5">
          <PasswordField label="New password" autoComplete="new-password" {...form.field('password')}>
            <PasswordStrength value={form.values.password} />
          </PasswordField>
          <PasswordField label="Confirm new password" autoComplete="new-password" {...form.field('confirm')} />
        </fieldset>
        <Button type="submit" size="lg" fullWidth loading={submitting} className="mt-8!">
          Update password
        </Button>
      </form>
      <BackToSignIn />
    </div>
  );
}
