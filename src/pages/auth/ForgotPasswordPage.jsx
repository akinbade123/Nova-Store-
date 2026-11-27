import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { TextField, fieldId } from '../../components/ui/Field';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useForm } from '../../hooks/useForm';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { EMAIL_PATTERN } from '../../utils/validation';

const RESEND_SECONDS = 30;

const validate = (values) => {
  if (!values.email.trim()) return { email: 'Enter the email you use for NOVA' };
  if (!EMAIL_PATTERN.test(values.email.trim())) return { email: 'Enter a valid email, like name@example.com' };
  return {};
};

export default function ForgotPasswordPage() {
  useDocumentTitle('Reset your password');
  const { requestPasswordReset } = useAuth();
  const { toast } = useToast();
  const form = useForm({ email: '' }, validate);
  const [status, setStatus] = useState('idle'); // idle | sending | sent
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [devResetPath, setDevResetPath] = useState(null);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const send = async () => {
    setError('');
    setStatus('sending');
    try {
      const result = await requestPasswordReset(form.values.email.trim());
      setDevResetPath(result?.devResetPath ?? null);
      setStatus('sent');
      setCooldown(RESEND_SECONDS);
      return true;
    } catch (err) {
      setStatus('idle');
      setError(err.userMessage ?? 'We couldn’t send the email right now. Please try again in a moment.');
      return false;
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (Object.keys(form.submit()).length) {
      document.getElementById(fieldId('email'))?.focus();
      return;
    }
    await send();
  };

  if (status === 'sent') {
    return (
      <div className="animate-fade-in">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-surface">
          <MailCheck className="size-7" strokeWidth={1.5} aria-hidden="true" />
        </span>
        <h1 className="mt-6 text-title font-bold leading-tight tracking-tight sm:text-4xl">Check your inbox</h1>
        <p className="mt-3 text-body leading-relaxed text-muted" role="status">
          If there’s a NOVA account for <span className="font-medium text-ink">{form.values.email.trim()}</span>, you’ll get an
          email with a link to reset your password. The link expires in 1 hour.
        </p>
        {devResetPath && (
          <Alert tone="info" className="mt-8">
            Sample-data mode doesn’t send emails.{' '}
            <Link to={devResetPath} className="font-semibold underline underline-offset-4 hover:no-underline">
              Open the reset link
            </Link>
          </Alert>
        )}
        <Alert tone="info" className={devResetPath ? 'mt-3' : 'mt-8'}>
          Can’t find it? Check your spam or promotions folder, or make sure you used the email linked to your account.
        </Alert>
        <div className="mt-8 grid gap-3">
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            disabled={cooldown > 0}
            onClick={async () => {
              if (await send()) toast({ title: 'Email sent again', description: form.values.email.trim() });
            }}
          >
            {cooldown > 0 ? `Resend email in ${cooldown}s` : 'Resend email'}
          </Button>
          <button
            type="button"
            onClick={() => {
              setStatus('idle');
              setCooldown(0);
            }}
            className="h-11 text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline"
          >
            Use a different email
          </button>
        </div>
        <Link to="/login" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-title font-bold leading-tight tracking-tight sm:text-4xl">Reset your password</h1>
      <p className="mt-3 text-body leading-relaxed text-muted">
        Enter the email you use for NOVA and we’ll send you a link to create a new password.
      </p>
      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        {error && <Alert>{error}</Alert>}
        <fieldset disabled={status === 'sending'}>
          <TextField label="Email" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" {...form.field('email')} />
        </fieldset>
        <Button type="submit" size="lg" fullWidth loading={status === 'sending'} className="mt-8!">
          Send reset link
        </Button>
      </form>
      <Link to="/login" className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to sign in
      </Link>
    </div>
  );
}
