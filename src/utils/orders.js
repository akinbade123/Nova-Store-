import { BRAND_LABELS } from './validation';

/** Total number of units in an order. */
export const itemCount = (order) => order.items.reduce((sum, item) => sum + item.quantity, 0);

/** "Visa ending 4242", "PayPal"… */
export function paymentLabel(payment) {
  if (payment.method === 'paypal') return 'PayPal';
  if (payment.method === 'applepay') return 'Apple Pay';
  return `${BRAND_LABELS[payment.brand] ?? 'Card'} ending ${payment.last4}`;
}
