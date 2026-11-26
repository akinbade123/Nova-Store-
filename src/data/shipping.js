import { FREE_SHIPPING_THRESHOLD } from './site.js';

/** Shipping methods. `freeOver` waives the fee once the bag subtotal reaches it. */
export const SHIPPING_METHODS = [
  { id: 'standard', label: 'Standard', eta: '3–5 business days', price: 4.95, freeOver: FREE_SHIPPING_THRESHOLD, minDays: 3, maxDays: 5 },
  { id: 'express', label: 'Express', eta: '1–2 business days', price: 9.95, freeOver: FREE_SHIPPING_THRESHOLD, minDays: 1, maxDays: 2 },
  { id: 'next-day', label: 'Next day', eta: 'Order before 2pm', price: 19.95, freeOver: null, minDays: 1, maxDays: 1 },
];
