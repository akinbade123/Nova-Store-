import { useState } from 'react';
import { Alert } from '../ui/Alert';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

/** Shown on account pages until the email is confirmed, with a way to send the link again. */
export function EmailVerificationBanner() {
  const { user, resendVerification, refreshUser } = useAuth();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  if (user?.emailVerified !== false) return null;

  const resend = async () => {
    setSending(true);
    try {
      const result = await resendVerification();
      if (result.alreadyVerified) {
        await refreshUser();
        toast({ title: 'Your email is already confirmed' });
      } else {
        toast({ title: 'Link sent', description: `Check ${user.email}. It expires in 24 hours.` });
      }
    } catch (error) {
      toast({ variant: 'error', title: 'Couldn’t send the link', description: error.userMessage });
    } finally {
      setSending(false);
    }
  };

  return (
    <Alert tone="info" title="Confirm your email" className="mt-6">
      We sent a link to <span className="font-medium">{user.email}</span>. Confirming it links any orders you placed as a guest to
      this account.{' '}
      <button
        type="button"
        onClick={resend}
        disabled={sending}
        className="font-semibold underline underline-offset-4 can-hover:no-underline disabled:opacity-60"
      >
        {sending ? 'Sending…' : 'Send it again'}
      </button>
    </Alert>
  );
}
