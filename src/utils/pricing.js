import { SHIPPING_METHODS } from '../data/shipping';

const round = (value) => Math.round(value * 100) / 100;

export function shippingCost(method, subtotal) {
  if (!method) return 0;
  if (method.freeOver !== null && subtotal >= method.freeOver) return 0;
  return method.price;
}

/**
 * Order totals shared by the bag drawer, cart page and checkout.
 * Prices include tax. Free-shipping thresholds use the pre-discount subtotal.
 */
export function computeTotals({ subtotal, promo, shippingMethodId = 'standard' }) {
  const method = SHIPPING_METHODS.find((item) => item.id === shippingMethodId) ?? SHIPPING_METHODS[0];
  const promoShortfall = promo ? Math.max(promo.minSubtotal - subtotal, 0) : 0;
  const promoActive = Boolean(promo) && promoShortfall === 0 && subtotal > 0;

  const discount = promoActive && promo.type === 'percent' ? round((subtotal * promo.value) / 100) : 0;
  const baseShipping = subtotal > 0 ? shippingCost(method, subtotal) : 0;
  const shippingDiscount = promoActive && promo.type === 'shipping' ? baseShipping : 0;
  const shipping = baseShipping - shippingDiscount;
  const total = round(Math.max(subtotal - discount + shipping, 0));

  return { subtotal, discount, shipping, shippingDiscount, method, total, promoActive, promoShortfall };
}
