import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, CircleAlert, Lock, ShoppingBag } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { TextField, CheckboxField, fieldId } from '../components/ui/Field';
import { AddressFields } from '../components/checkout/AddressFields';
import { ShippingMethods } from '../components/checkout/ShippingMethods';
import { PaymentMethods } from '../components/checkout/PaymentMethods';
import { CheckoutSummary } from '../components/checkout/CheckoutSummary';
import { DRAFT_FIELDS, initialCheckoutValues, pickAddress, validateCheckout } from '../components/checkout/checkoutSchema';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { readAddresses } from '../services/addressService';
import { useForm } from '../hooks/useForm';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { orderService } from '../services/orderService';
import { cardBrand } from '../utils/validation';
import { deliveryWindow, formatPrice } from '../utils/format';

const DRAFT_KEY = 'nova:checkout-draft';
const CHECKOUT_ID_KEY = 'nova:checkout-id';

/**
 * The id the server uses to recognise a repeated "Place order" (see docs/API.md, POST /orders).
 * One per cart: it survives reloads and retries of the same cart, and a changed cart gets a new one,
 * so a retry can never return an order for different items.
 */
function checkoutIdFor(cartSignature) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(CHECKOUT_ID_KEY));
    if (saved?.cart === cartSignature) return saved.id;
  } catch {
    /* start a new one */
  }
  const id = crypto.randomUUID();
  sessionStorage.setItem(CHECKOUT_ID_KEY, JSON.stringify({ id, cart: cartSignature }));
  return id;
}

/**
 * True when we can't know whether the server created the order: no response, or a server error.
 * 501 is excluded: it means the endpoint doesn't exist yet, so nothing was created.
 */
const outcomeUnknown = (err) =>
  Boolean(err.isAxiosError) && (!err.response || (err.response.status >= 500 && err.response.status !== 501));

/** Saved draft first, then the signed-in profile, then blanks. */
function loadDraft(user) {
  const saved = user ? readAddresses(user.id).find((address) => address.isDefault) : null;
  const fromAddress = saved
    ? {
        firstName: saved.firstName,
        lastName: saved.lastName,
        address1: saved.address1,
        address2: saved.address2,
        city: saved.city,
        region: saved.region,
        postalCode: saved.postalCode,
        country: saved.country,
        phone: saved.phone ?? '',
      }
    : {};
  const fromProfile = user ? { email: user.email, firstName: user.firstName, lastName: user.lastName, ...fromAddress } : {};
  try {
    const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? '{}');
    const filled = Object.fromEntries(Object.entries(draft).filter(([, value]) => value !== ''));
    return { ...initialCheckoutValues, ...fromProfile, ...filled };
  } catch {
    return { ...initialCheckoutValues, ...fromProfile };
  }
}

function Section({ step, title, aside, id, children }) {
  return (
    <section aria-labelledby={id} className="border-t border-line pt-8 first:border-0 first:pt-0">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 id={id} className="flex items-baseline gap-3 text-xl font-semibold">
          <span className="font-sans text-sm font-medium tabular-nums text-muted" aria-hidden="true">
            {String(step).padStart(2, '0')}
          </span>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function ErrorSummary({ errors, innerRef }) {
  const entries = Object.entries(errors);
  return (
    <div ref={innerRef} tabIndex={-1} role="alert" className="mb-8 rounded-2xl bg-danger/[0.05] p-5 ring-1 ring-inset ring-danger/25 outline-none">
      <p className="flex items-center gap-2 text-sm font-semibold text-danger">
        <CircleAlert className="size-5" aria-hidden="true" />
        {entries.length === 1 ? 'There’s 1 thing to fix' : `There are ${entries.length} things to fix`} before placing your order
      </p>
      <ul className="mt-3 space-y-1.5 pl-7 text-sm">
        {entries.map(([name, message]) => (
          <li key={name}>
            <a
              href={`#${fieldId(name)}`}
              onClick={(event) => {
                event.preventDefault();
                const input = document.getElementById(fieldId(name));
                input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                input?.focus({ preventScroll: true });
              }}
              className="text-danger underline underline-offset-2 hover:no-underline"
            >
              {message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function CheckoutPage() {
  useDocumentTitle('Checkout');
  const navigate = useNavigate();
  const { items, loading: cartLoading, count, subtotal, promo, getTotals, clear } = useCart();
  const { user } = useAuth();
  const form = useForm(loadDraft(user), validateCheckout);
  const { values, setField } = form;

  const [placing, setPlacing] = useState(false);
  const placingRef = useRef(false);
  const [paymentError, setPaymentError] = useState(null);
  const errorSummaryRef = useRef(null);
  const paymentRef = useRef(null);

  const totals = getTotals(values.shippingMethod);
  const hasErrors = form.submitted && Object.keys(form.allErrors).length > 0;

  // Save contact and address details (never card data) so a refresh keeps them.
  useEffect(() => {
    const draft = Object.fromEntries(DRAFT_FIELDS.map((name) => [name, values[name]]));
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [values]);

  // Clear a stale payment error once the shopper edits payment details.
  useEffect(() => {
    setPaymentError(null);
  }, [values.paymentMethod, values.cardNumber, values.cardExpiry, values.cardCvc]);

  if (cartLoading) return <div className="min-h-[60vh]" aria-busy="true" />;

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-surface">
          <ShoppingBag className="size-7" strokeWidth={1.5} aria-hidden="true" />
        </span>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">Your bag is empty</h1>
        <p className="mt-3 text-[15px] text-muted">Add something you love, then come back here to check out.</p>
        <Button to="/shop" size="lg" className="mt-8">
          Continue shopping
        </Button>
      </div>
    );
  }

  const payLabel =
    values.paymentMethod === 'paypal'
      ? 'Continue to PayPal'
      : values.paymentMethod === 'applepay'
        ? `Pay ${formatPrice(totals.total)} with Apple Pay`
        : `Pay ${formatPrice(totals.total)}`;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setPaymentError(null);
    const errors = form.submit();
    if (Object.keys(errors).length > 0) {
      requestAnimationFrame(() => {
        errorSummaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        errorSummaryRef.current?.focus({ preventScroll: true });
      });
      return;
    }

    // `placing` only updates after a re-render, so a double click could otherwise submit twice.
    if (placingRef.current) return;
    placingRef.current = true;
    setPlacing(true);
    try {
      const shippingAddress = pickAddress(values);
      const order = await orderService.placeOrder({
        checkoutId: checkoutIdFor(items.map((item) => `${item.key}x${item.quantity}`).join(',')),
        userId: user?.id ?? null,
        contact: { email: values.email.trim(), phone: values.phone.trim(), marketing: values.marketing },
        shippingAddress,
        billingAddress: values.paymentMethod === 'card' && !values.billingSame ? pickAddress(values, 'billing') : shippingAddress,
        shippingMethod: { id: totals.method.id, label: totals.method.label, eta: totals.method.eta },
        estimatedDelivery: deliveryWindow(totals.method.minDays, totals.method.maxDays),
        payment: {
          method: values.paymentMethod,
          brand: values.paymentMethod === 'card' ? cardBrand(values.cardNumber) : null,
          // Never send the full card number. With a real payment provider, its hosted card
          // fields return a token, and that token is sent here instead.
          last4: values.paymentMethod === 'card' ? values.cardNumber.replace(/\D/g, '').slice(-4) : null,
        },
        items: items.map(({ product, quantity, color, size }) => ({
          productId: product.id,
          slug: product.slug,
          name: product.name,
          image: product.images[0].src,
          price: product.price,
          quantity,
          color: color ?? null,
          size: size ?? null,
        })),
        totals: {
          subtotal: totals.subtotal,
          discount: totals.discount,
          shipping: totals.shipping,
          total: totals.total,
        },
        promo: totals.promoActive ? promo : null,
      });
      sessionStorage.removeItem(DRAFT_KEY);
      sessionStorage.removeItem(CHECKOUT_ID_KEY);
      navigate(`/checkout/confirmation/${order.id}`, { replace: true, state: { order } });
      clear();
    } catch (err) {
      // A definite "no" (e.g. card declined) means no order exists, so the next attempt is a new one.
      // If the outcome is unknown, keep the id: the server returns the order if it was created.
      if (!outcomeUnknown(err)) sessionStorage.removeItem(CHECKOUT_ID_KEY);
      placingRef.current = false;
      setPlacing(false);
      // Never say the payment failed when it may have gone through.
      setPaymentError(
        outcomeUnknown(err)
          ? {
              title: 'We couldn’t confirm your order',
              message: 'We lost the connection before hearing back. Try again: if your first attempt went through, you’ll see that order and won’t be charged twice.',
            }
          : { title: 'Your order wasn’t placed', message: err.userMessage ?? 'We couldn’t process your payment. Please try again.' },
      );
      requestAnimationFrame(() => paymentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  };

  return (
    <>
      <CheckoutSummary variant="collapsible" items={items} totals={totals} count={count} promo={promo} />

      <div className="lg:flex lg:min-h-[calc(100dvh-72px)]">
        {/* Form column */}
        <div className="flex-1 lg:flex lg:justify-end">
          <div className="mx-auto w-full max-w-xl px-4 pb-16 pt-8 sm:px-6 lg:mx-0 lg:max-w-[640px] lg:px-12 lg:pb-20 lg:pt-12 xl:pr-20">
            <nav aria-label="Checkout progress" className="mb-8">
              <ol className="flex items-center gap-2 text-[13px] text-muted">
                <li>
                  <Link to="/cart" className="hover:text-ink">
                    Bag
                  </Link>
                </li>
                <li aria-hidden="true">
                  <ChevronRight className="size-3.5 text-subtle" />
                </li>
                <li aria-current="step" className="font-medium text-ink">
                  Details & payment
                </li>
                <li aria-hidden="true">
                  <ChevronRight className="size-3.5 text-subtle" />
                </li>
                <li>Confirmation</li>
              </ol>
            </nav>
            <h1 className="mb-8 text-3xl font-bold tracking-tight sm:text-4xl">Checkout</h1>

            <form onSubmit={handleSubmit} noValidate>
              {hasErrors && <ErrorSummary errors={form.allErrors} innerRef={errorSummaryRef} />}

              <fieldset disabled={placing} className="space-y-10">
                <Section
                  step={1}
                  id="contact-heading"
                  title="Contact"
                  aside={
                    user ? (
                      <p className="text-[13px] text-muted">
                        Signed in as <span className="font-medium text-ink">{user.firstName}</span>
                      </p>
                    ) : (
                      <Link to="/login?redirect=/checkout" className="text-[13px] font-medium underline underline-offset-4 hover:text-muted">
                        Sign in
                      </Link>
                    )
                  }
                >
                  <div className="grid gap-5 sm:grid-cols-2">
                    <TextField
                      label="Email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      hint="We’ll send your receipt and tracking details here."
                      className="sm:col-span-2"
                      {...form.field('email')}
                    />
                    <TextField
                      label="Phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="+1 555 123 4567"
                      hint="For delivery updates only."
                      className="sm:col-span-2"
                      {...form.field('phone')}
                    />
                  </div>
                  <CheckboxField
                    name="marketing"
                    className="mt-5"
                    label="Email me about new arrivals and exclusive offers"
                    checked={values.marketing}
                    onChange={(event) => setField('marketing', event.target.checked)}
                  />
                </Section>

                <Section step={2} id="delivery-heading" title="Delivery address">
                  <AddressFields form={form} />
                </Section>

                <Section step={3} id="shipping-heading" title="Shipping method">
                  <ShippingMethods
                    value={values.shippingMethod}
                    onChange={(id) => setField('shippingMethod', id)}
                    subtotal={subtotal}
                    freeShippingPromo={totals.promoActive && promo?.type === 'shipping'}
                  />
                </Section>

                <div ref={paymentRef} className="scroll-mt-6">
                  <Section step={4} id="payment-heading" title="Payment">
                    <PaymentMethods form={form} paymentError={paymentError} />
                  </Section>
                </div>
              </fieldset>

              <div className="mt-10 border-t border-line pt-8">
                <dl className="mb-6 flex items-baseline justify-between lg:hidden">
                  <dt className="text-base font-semibold">Total</dt>
                  <dd className="text-2xl font-semibold tabular-nums">{formatPrice(totals.total)}</dd>
                </dl>
                <Button type="submit" size="lg" fullWidth loading={placing} className="h-14 text-base">
                  <Lock className="size-4" aria-hidden="true" />
                  {payLabel}
                </Button>
                {placing && (
                  <p className="mt-3 text-center text-sm text-muted" role="status">
                    Processing your payment — please don’t close this page.
                  </p>
                )}
                <p className="mt-4 text-center text-xs leading-relaxed text-muted">
                  By placing your order you agree to NOVA’s{' '}
                  <Link to="/legal/terms" className="underline underline-offset-2 hover:text-ink">Terms of service</Link> and{' '}
                  <Link to="/legal/privacy" className="underline underline-offset-2 hover:text-ink">Privacy policy</Link>.
                </p>
                <Link
                  to="/cart"
                  className="mx-auto mt-6 flex w-fit items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
                >
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  Return to bag
                </Link>
              </div>
            </form>
          </div>
        </div>

        {/* Summary column */}
        <aside className="hidden border-l border-line bg-surface lg:block lg:w-[42%] xl:w-[44%]">
          <div className="sticky top-0 max-w-[500px] px-12 py-12 xl:px-16">
            <CheckoutSummary items={items} totals={totals} count={count} promo={promo} />
          </div>
        </aside>
      </div>
    </>
  );
}
