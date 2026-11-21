import { CircleAlert, CreditCard, Lock } from 'lucide-react';
import { RadioCard } from './RadioCard';
import { AddressFields } from './AddressFields';
import { TextField, CheckboxField } from '../ui/Field';
import { paymentMethods as paymentMarks } from '../ui/BrandIcons';
import { BRAND_LABELS, cardBrand, formatCardNumber, formatExpiry } from '../../utils/validation';

const mark = (name) => paymentMarks.find((item) => item.name === name)?.mark;

function MarkChip({ name }) {
  return (
    <span className="inline-flex h-6 w-10 items-center justify-center rounded-[4px] bg-white ring-1 ring-black/10" title={name}>
      {mark(name)}
    </span>
  );
}

function CardBrandBadge({ number }) {
  const brand = cardBrand(number);
  if (!brand) return <CreditCard className="size-5 text-subtle" strokeWidth={1.5} aria-hidden="true" />;
  const name = { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express' }[brand];
  return (
    <span className="flex items-center">
      <MarkChip name={name} />
      <span className="sr-only">{BRAND_LABELS[brand]}</span>
    </span>
  );
}

export function PaymentMethods({ form, paymentError }) {
  const { values, setField } = form;
  const brand = cardBrand(values.cardNumber);

  return (
    <div className="space-y-3">
      {paymentError && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl bg-danger/[0.06] p-4 text-sm text-danger ring-1 ring-inset ring-danger/20">
          <CircleAlert className="mt-px size-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Payment unsuccessful</p>
            <p className="mt-0.5 text-danger/90">{paymentError}</p>
          </div>
        </div>
      )}

      <div role="radiogroup" aria-label="Payment method" className="space-y-3">
        <RadioCard
          name="paymentMethod"
          value="card"
          checked={values.paymentMethod === 'card'}
          onChange={() => setField('paymentMethod', 'card')}
          title="Credit or debit card"
          aside={
            <span className="hidden items-center gap-1 sm:flex" aria-label="Visa, Mastercard, American Express">
              <MarkChip name="Visa" />
              <MarkChip name="Mastercard" />
              <MarkChip name="American Express" />
            </span>
          }
        >
          <div className="grid grid-cols-2 gap-x-4 gap-y-5">
            <TextField
              label="Card number"
              className="col-span-2"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="1234 1234 1234 1234"
              maxLength={23}
              suffix={<CardBrandBadge number={values.cardNumber} />}
              inputClassName="tabular-nums tracking-wide"
              {...form.field('cardNumber', { format: formatCardNumber })}
            />
            <TextField
              label="Expiry date"
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM / YY"
              maxLength={7}
              inputClassName="tabular-nums"
              {...form.field('cardExpiry', { format: formatExpiry })}
            />
            <TextField
              label="Security code"
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder={brand === 'amex' ? '4 digits' : '3 digits'}
              maxLength={brand === 'amex' ? 4 : 3}
              hint={brand === 'amex' ? '4 digits on the front of your card' : '3 digits on the back of your card'}
              inputClassName="tabular-nums"
              {...form.field('cardCvc', { format: (value) => value.replace(/\D/g, '') })}
            />
            <TextField label="Name on card" className="col-span-2" autoComplete="cc-name" {...form.field('cardName')} />
          </div>

          <CheckboxField
            name="billingSame"
            className="mt-6"
            label="Billing address is the same as delivery"
            checked={values.billingSame}
            onChange={(event) => setField('billingSame', event.target.checked)}
          />
          {!values.billingSame && (
            <fieldset className="mt-6 animate-fade-in">
              <legend className="mb-4 text-sm font-semibold">Billing address</legend>
              <AddressFields form={form} prefix="billing" autoCompleteSection="billing" />
            </fieldset>
          )}
          <p className="mt-6 flex items-center gap-2 text-xs text-muted">
            <Lock className="size-3.5" aria-hidden="true" />
            Payments are encrypted and processed securely. We never store your full card number.
          </p>
        </RadioCard>

        <RadioCard
          name="paymentMethod"
          value="paypal"
          checked={values.paymentMethod === 'paypal'}
          onChange={() => setField('paymentMethod', 'paypal')}
          title="PayPal"
          aside={<MarkChip name="PayPal" />}
        >
          <p className="text-sm leading-relaxed text-muted">
            After placing your order you’ll be taken to PayPal to sign in and complete your purchase securely.
          </p>
        </RadioCard>

        <RadioCard
          name="paymentMethod"
          value="applepay"
          checked={values.paymentMethod === 'applepay'}
          onChange={() => setField('paymentMethod', 'applepay')}
          title="Apple Pay"
          aside={<MarkChip name="Apple Pay" />}
        >
          <p className="text-sm leading-relaxed text-muted">
            Confirm the payment with Face ID, Touch ID or your passcode when prompted.
          </p>
        </RadioCard>
      </div>
    </div>
  );
}
