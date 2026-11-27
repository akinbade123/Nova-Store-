import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CircleCheck, CircleAlert, LoaderCircle } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

/**
 * Landing page for the link in the confirmation email: /verify-email?token=…
 * Works signed in or out, because the link is often opened on another device.
 */
export default function VerifyEmailPage() {
  useDocumentTitle('Confirm your email');
  const [params] = useSearchParams();
  const token = params.get('token');
  const { isAuthenticated, verifyEmail, resendVerification } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState(token ? { status: 'checking' } : { status: 'failed', message: 'This link is incomplete. Open it from the email again.' });
  const [resending, setResending] = useState(false);
  // A link works once, so make sure it's only sent once (React runs effects twice in development).
  const sent = useRef(false);

  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true;
    verifyEmail(token).then(
      (result) => setState({ status: 'verified', email: result.email }),
      (error) => setState({ status: 'failed', message: error.userMessage ?? 'We couldn’t confirm your email. Please try again.' }),
    );
  }, [token, verifyEmail]);

  const resend = async () => {
    setResending(true);
    try {
      const result = await resendVerification();
      toast(result.alreadyVerified ? { title: 'Your email is already confirmed' } : { title: 'New link sent', description: 'Check your inbox. It expires in 24 hours.' });
    } catch (error) {
      toast({ variant: 'error', title: 'Couldn’t send a new link', description: error.userMessage });
    } finally {
      setResending(false);
    }
  };

  return (
    <Container className="flex flex-col items-center py-24 text-center lg:py-32" aria-live="polite">
      {state.status === 'checking' && (
        <>
          <LoaderCircle className="size-10 animate-spin text-muted" aria-hidden="true" />
          <h1 className="mt-6 text-title font-bold tracking-tight">Confirming your email…</h1>
        </>
      )}

      {state.status === 'verified' && (
        <>
          <CircleCheck className="size-12 text-success" strokeWidth={1.5} aria-hidden="true" />
          <h1 className="mt-6 text-title font-bold tracking-tight sm:text-4xl">Email confirmed</h1>
          <p className="mt-3 max-w-md text-body leading-relaxed text-muted">
            Thanks. <span className="font-medium text-ink">{state.email}</span> is confirmed, and orders placed with it will show in your account.
          </p>
          <Button to={isAuthenticated ? '/account' : '/login'} size="lg" className="mt-8">
            {isAuthenticated ? 'Go to your account' : 'Sign in'}
          </Button>
        </>
      )}

      {state.status === 'failed' && (
        <>
          <CircleAlert className="size-12 text-danger" strokeWidth={1.5} aria-hidden="true" />
          <h1 className="mt-6 text-title font-bold tracking-tight sm:text-4xl">We couldn’t confirm your email</h1>
          <p className="mt-3 max-w-md text-body leading-relaxed text-muted">{state.message}</p>
          {isAuthenticated ? (
            <Button size="lg" className="mt-8" loading={resending} onClick={resend}>
              Send a new link
            </Button>
          ) : (
            <Button to="/login?redirect=%2Faccount" size="lg" className="mt-8">
              Sign in to get a new link
            </Button>
          )}
        </>
      )}
    </Container>
  );
}
