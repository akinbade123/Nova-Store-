import { useState } from 'react';
import { CircleAlert, CircleCheck, Mail } from 'lucide-react';
import { Container } from '../ui/Container';
import { Button } from '../ui/Button';
import { newsletterService } from '../../services/newsletterService';
import { useToast } from '../../context/ToastContext';
import { cn } from '../../utils/cn';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function Newsletter() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    const value = email.trim();
    if (!value) return setError('Please enter your email address.');
    if (!EMAIL_PATTERN.test(value)) return setError('That email doesn’t look quite right — please check it.');

    setError('');
    setStatus('loading');
    try {
      await newsletterService.subscribe(value);
      setStatus('success');
      toast({ title: 'You’re on the list', description: 'Check your inbox for 10% off your first order.' });
    } catch (err) {
      setStatus('idle');
      setError(err.userMessage ?? 'We couldn’t subscribe you right now. Please try again.');
    }
  };

  return (
    <section aria-labelledby="newsletter-heading" className="pb-16 lg:pb-24">
      <Container>
        <div className="grid items-center gap-8 rounded-[24px] bg-surface-warm px-6 py-12 sm:px-10 sm:py-14 lg:grid-cols-2 lg:gap-16 lg:rounded-[32px] lg:px-16 lg:py-20">
          <div>
            <p className="eyebrow text-muted">The NOVA list</p>
            <h2 id="newsletter-heading" className="mt-3 text-heading font-bold leading-[1.08] sm:text-[44px]">
              Get 10% off your first order.
            </h2>
            <p className="mt-4 max-w-md text-body leading-relaxed text-ink/70">
              Be first to hear about new arrivals, members-only offers and stories from the makers behind our products.
            </p>
          </div>

          {status === 'success' ? (
            <div role="status" className="flex animate-fade-in items-start gap-4 rounded-2xl bg-white p-6 ring-1 ring-line">
              <CircleCheck className="mt-0.5 size-6 shrink-0 text-success" strokeWidth={1.75} aria-hidden="true" />
              <div>
                <p className="font-semibold">Welcome to NOVA.</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  We’ve sent your 10% code to <span className="font-medium text-ink">{email.trim()}</span>. It’s valid for 30 days.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="w-full">
              <label htmlFor="newsletter-email" className="mb-2 block text-sm font-medium">
                Email address
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div
                  className={cn(
                    'flex h-13 shrink-0 items-center sm:flex-1 gap-3 rounded-md bg-white px-5 ring-1 ring-inset transition-shadow focus-within:ring-2',
                    error ? 'ring-danger focus-within:ring-danger' : 'ring-line-strong focus-within:ring-ink',
                  )}
                >
                  <Mail className="size-[18px] shrink-0 text-muted" strokeWidth={1.75} aria-hidden="true" />
                  <input
                    id="newsletter-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (error) setError('');
                    }}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'newsletter-error' : 'newsletter-hint'}
                    className="h-full w-full bg-transparent text-body outline-none placeholder:text-subtle"
                  />
                </div>
                <Button type="submit" size="lg" loading={status === 'loading'} className="sm:min-w-[140px]">
                  Subscribe
                </Button>
              </div>
              {error ? (
                <p id="newsletter-error" role="alert" className="mt-2.5 flex items-center gap-1.5 text-caption font-medium text-danger">
                  <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
                  {error}
                </p>
              ) : (
                <p id="newsletter-hint" className="mt-2.5 text-caption text-muted">
                  No spam. Unsubscribe anytime. Read our{' '}
                  <a href="/legal/privacy" className="underline underline-offset-2 hover:text-ink">
                    privacy policy
                  </a>
                  .
                </p>
              )}
            </form>
          )}
        </div>
      </Container>
    </section>
  );
}
