import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleAlert, CircleCheck, Clock, CreditCard, Mail, MessageCircle, Package, Phone, RotateCcw, Search, Truck, User, X } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { Button } from '../components/ui/Button';
import { AccordionItem } from '../components/ui/Accordion';
import { SelectField, TextField, fieldId } from '../components/ui/Field';
import { useAuth } from '../context/AuthContext';
import { useForm } from '../hooks/useForm';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { supportService } from '../services/supportService';
import { faqSections } from '../data/faqs';
import { EMAIL_PATTERN } from '../utils/validation';
import { cn } from '../utils/cn';
import { contactEmail } from '../data/site';

const ICONS = { orders: Package, shipping: Truck, returns: RotateCcw, payments: CreditCard, account: User };

const TOPICS = ['An order I’ve placed', 'Returns or refunds', 'Delivery', 'Payment or promo codes', 'My account', 'Product question', 'Something else'];

const validate = (values) => {
  const errors = {};
  if (!values.name.trim()) errors.name = 'Enter your name';
  if (!values.email.trim()) errors.email = 'Enter your email address';
  else if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = 'Enter a valid email, like name@example.com';
  if (!values.topic) errors.topic = 'Choose what your message is about';
  if (values.message.trim().length < 20) errors.message = 'Tell us a little more — at least 20 characters';
  return errors;
};

function ContactForm({ onReset }) {
  const { user } = useAuth();
  const form = useForm(
    { name: user ? `${user.firstName} ${user.lastName}` : '', email: user?.email ?? '', order: '', topic: '', message: '' },
    validate,
  );
  const [status, setStatus] = useState({ state: 'idle' });
  const { error: messageError, ...messageField } = form.field('message');

  const submit = async (event) => {
    event.preventDefault();
    const first = Object.keys(form.submit())[0];
    if (first) {
      document.getElementById(fieldId(first))?.focus();
      return;
    }
    setStatus({ state: 'sending' });
    try {
      const { ticket } = await supportService.contact(form.values);
      setStatus({ state: 'sent', ticket });
    } catch (err) {
      setStatus({ state: 'error', message: err.userMessage ?? 'We couldn’t send your message. Please try again or email us directly.' });
    }
  };

  if (status.state === 'sent') {
    return (
      <div role="status" className="flex flex-col items-start rounded-3xl bg-success/[0.06] p-8 ring-1 ring-inset ring-success/20">
        <CircleCheck className="size-8 text-success" strokeWidth={1.5} aria-hidden="true" />
        <h3 className="mt-5 text-xl font-semibold">Message sent — thank you</h3>
        <p className="mt-2 text-body leading-relaxed text-ink/75">
          Your reference is <span className="font-semibold text-ink">{status.ticket}</span>. We’ve emailed a copy to{' '}
          <span className="font-medium text-ink">{form.values.email.trim()}</span> and will reply within a few hours (Monday to Saturday).
        </p>
        <Button variant="secondary" className="mt-6 bg-white" onClick={onReset}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="rounded-3xl p-6 ring-1 ring-inset ring-line sm:p-8">
      {status.state === 'error' && (
        <p role="alert" className="mb-6 flex items-start gap-2 rounded-xl bg-danger/[0.06] p-3.5 text-sm text-danger">
          <CircleAlert className="mt-px size-4 shrink-0" aria-hidden="true" />
          {status.message}
        </p>
      )}
      <fieldset disabled={status.state === 'sending'} className="grid gap-5 sm:grid-cols-2">
        <TextField label="Name" autoComplete="name" {...form.field('name')} />
        <TextField label="Email" type="email" inputMode="email" autoComplete="email" {...form.field('email')} />
        <SelectField label="What’s it about?" {...form.field('topic')}>
          <option value="">Choose a topic</option>
          {TOPICS.map((topic) => (
            <option key={topic}>{topic}</option>
          ))}
        </SelectField>
        <TextField label="Order number" optional placeholder="e.g. NV-8K2Q4D" autoCapitalize="characters" {...form.field('order')} />
        <div className="sm:col-span-2">
          <label htmlFor={fieldId('message')} className="mb-1.5 flex justify-between text-caption font-medium">
            Message
            <span className={cn('text-xs font-normal tabular-nums', messageField.value.length > 1000 ? 'text-danger' : 'text-muted')}>
              {messageField.value.length}/1000
            </span>
          </label>
          <textarea
            id={fieldId('message')}
            rows={6}
            maxLength={1000}
            aria-invalid={Boolean(messageError)}
            aria-describedby={messageError ? `${fieldId('message')}-error` : undefined}
            placeholder="How can we help? Include any details that will help us sort it quickly."
            className={cn(
              'w-full resize-y rounded-xl bg-white px-4 py-3 text-body outline-none ring-1 ring-inset transition-shadow placeholder:text-subtle focus:ring-2',
              messageError ? 'ring-danger focus:ring-danger' : 'ring-line-strong hover:ring-subtle focus:ring-ink',
            )}
            {...messageField}
          />
          {messageError && (
            <p id={`${fieldId('message')}-error`} className="mt-1.5 flex items-start gap-1.5 text-caption font-medium text-danger">
              <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
              {messageError}
            </p>
          )}
        </div>
      </fieldset>
      <Button type="submit" size="lg" className="mt-6 w-full sm:w-auto" loading={status.state === 'sending'}>
        Send message
      </Button>
    </form>
  );
}

/** Remounts the form for “Send another message”, so it starts fresh. */
function ContactSection() {
  const [version, setVersion] = useState(0);
  return <ContactForm key={version} onReset={() => setVersion((value) => value + 1)} />;
}

export default function HelpPage() {
  useDocumentTitle('Help centre');
  const [query, setQuery] = useState('');
  const term = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!term) return [];
    return faqSections.flatMap((section) =>
      section.questions
        .filter((item) => `${item.q} ${item.a}`.toLowerCase().includes(term))
        .map((item) => ({ ...item, section })),
    );
  }, [term]);

  return (
    <>
      {/* Hero with search */}
      <section className="border-b border-line bg-surface-warm">
        <Container className="pb-14 pt-6 lg:pb-20 lg:pt-10">
          <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Help centre' }]} />
          <div className="mx-auto max-w-2xl pt-10 text-center lg:pt-14">
            <h1 className="text-title font-bold leading-[1.05] tracking-[-0.03em] sm:text-5xl">How can we help?</h1>
            <p className="mt-4 text-body text-muted sm:text-base">Search our answers, or get in touch — real people reply within hours.</p>
            <form role="search" onSubmit={(event) => event.preventDefault()} className="mt-8">
              <label className="mx-auto flex h-14 max-w-xl items-center gap-3 rounded-full bg-white px-5 shadow-soft ring-1 ring-line transition focus-within:ring-2 focus-within:ring-ink">
                <Search className="size-5 shrink-0 text-muted" strokeWidth={1.75} aria-hidden="true" />
                <span className="sr-only">Search help articles</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Try “returns”, “tracking” or “promo code”"
                  className="h-full w-full bg-transparent text-base outline-none placeholder:text-subtle [&::-webkit-search-cancel-button]:hidden"
                />
                {query && (
                  <button type="button" onClick={() => setQuery('')} className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-surface hover:bg-line" aria-label="Clear search">
                    <X className="size-3.5" />
                  </button>
                )}
              </label>
            </form>
          </div>
        </Container>
      </section>

      <Container className="py-14 lg:py-20">
        {term ? (
          <section aria-live="polite" aria-labelledby="results-heading" className="mx-auto max-w-3xl">
            <h2 id="results-heading" className="text-xl font-semibold">
              {results.length ? `${results.length} ${results.length === 1 ? 'answer' : 'answers'} for “${query.trim()}”` : `No answers for “${query.trim()}”`}
            </h2>
            {results.length ? (
              <div className="mt-6 border-t border-line">
                {results.map((item) => (
                  <AccordionItem key={item.q} title={item.q} defaultOpen={results.length <= 3} headingLevel={3}>
                    <p>{item.a}</p>
                    <p className="mt-3 eyebrow text-muted">{item.section.title}</p>
                  </AccordionItem>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-body text-muted">
                Try a different word, browse the topics below, or{' '}
                <a href="#contact" className="font-medium text-ink underline underline-offset-4">
                  send us a message
                </a>
                .
              </p>
            )}
          </section>
        ) : (
          <>
            {/* Topics */}
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5" aria-label="Help topics">
              {faqSections.map((section) => {
                const Icon = ICONS[section.id];
                return (
                  <li key={section.id}>
                    <a href={`#${section.id}`} className="group flex h-full flex-col rounded-2xl p-5 ring-1 ring-inset ring-line transition-colors hover:bg-surface hover:ring-transparent">
                      <Icon className="size-6" strokeWidth={1.5} aria-hidden="true" />
                      <span className="mt-6 text-body font-semibold">{section.title}</span>
                      <span className="mt-1 text-caption leading-snug text-muted">{section.summary}</span>
                    </a>
                  </li>
                );
              })}
            </ul>

            {/* FAQ sections */}
            <div className="mx-auto mt-16 max-w-3xl space-y-14 lg:mt-24">
              {faqSections.map((section) => (
                <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`} className="scroll-mt-24">
                  <h2 id={`${section.id}-heading`} className="text-2xl font-semibold tracking-tight sm:text-heading">
                    {section.title}
                  </h2>
                  <div className="mt-5 border-t border-line">
                    {section.questions.map((item) => (
                      <AccordionItem key={item.q} title={item.q}>
                        <p>{item.a}</p>
                      </AccordionItem>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}

        {/* Contact */}
        <section id="contact" aria-labelledby="contact-heading" className="mt-20 scroll-mt-24 border-t border-line pt-16 lg:mt-28 lg:pt-24">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.3fr] lg:gap-16">
            <div>
              <p className="eyebrow text-muted">Contact us</p>
              <h2 id="contact-heading" className="mt-3 text-heading font-semibold leading-[1.1] tracking-tight sm:text-4xl">
                Still need help?
              </h2>
              <p className="mt-4 max-w-md text-body leading-relaxed text-muted">
                Our customer care team is here Monday to Saturday. Most messages get a reply within a few hours.
              </p>
              <ul className="mt-8 space-y-3">
                {[
                  { Icon: MessageCircle, title: 'Send a message', text: 'Use the form — fastest for order questions', href: '#contact-form' },
                  { Icon: Mail, title: contactEmail.support, text: 'We reply within 4 hours', href: `mailto:${contactEmail.support}` },
                  { Icon: Phone, title: '+1 (800) 555-0199', text: 'Mon–Sat, 8am–8pm', href: 'tel:+18005550199' },
                ].map(({ Icon, title, text, href }) => (
                  <li key={title}>
                    <a href={href} className="flex items-center gap-4 rounded-2xl bg-surface p-4 transition-colors hover:bg-line">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white">
                        <Icon className="size-5" strokeWidth={1.5} aria-hidden="true" />
                      </span>
                      <span>
                        <span className="block text-body font-semibold">{title}</span>
                        <span className="block text-caption text-muted">{text}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-6 flex items-center gap-2 text-caption text-muted">
                <Clock className="size-4" aria-hidden="true" />
                Have your order number ready? Find it in{' '}
                <Link to="/account/orders" className="font-medium text-ink underline underline-offset-4">
                  your orders
                </Link>
                .
              </p>
            </div>
            <div id="contact-form" className="scroll-mt-24">
              <ContactSection />
            </div>
          </div>
        </section>
      </Container>
    </>
  );
}
