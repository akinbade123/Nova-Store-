import { api, mockDelay, USE_MOCK_DATA } from './api';

/* Sample promotions until the backend provides them. */
const PROMOTIONS = {
  NOVA10: { code: 'NOVA10', type: 'percent', value: 10, label: '10% off your order', minSubtotal: 0 },
  WELCOME15: { code: 'WELCOME15', type: 'percent', value: 15, label: '15% off orders over $150', minSubtotal: 150 },
  FREESHIP: { code: 'FREESHIP', type: 'shipping', value: 0, label: 'Free shipping', minSubtotal: 0 },
};

const reject = (message) => Promise.reject(Object.assign(new Error(message), { userMessage: message }));

export const cartService = {
  /** Validates a promo code against the current subtotal. Resolves to the promotion. */
  async validatePromo(rawCode, subtotal) {
    const code = rawCode.trim().toUpperCase();
    if (!code) return reject('Please enter a promo code.');

    if (!USE_MOCK_DATA) {
      const { data } = await api.post('/cart/promo', { code, subtotal });
      return data;
    }

    await mockDelay(null, 700);
    const promo = PROMOTIONS[code];
    if (!promo) return reject(`“${code}” isn’t a valid code. Check the spelling and try again.`);
    if (subtotal < promo.minSubtotal) {
      return reject(`${code} applies to orders over $${promo.minSubtotal}. Add a little more to use it.`);
    }
    return promo;
  },
};
