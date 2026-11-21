import { api, mockDelay, USE_MOCK_DATA } from './api';

const STORAGE_KEY = 'nova:orders';

const readOrders = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
};

const reject = (code, message) => Promise.reject(Object.assign(new Error(message), { code, userMessage: message }));

const newOrderId = () => `NV-${Date.now().toString(36).toUpperCase().slice(-6)}`;

export const orderService = {
  /**
   * Places an order. Payload: { contact, shippingAddress, billingAddress, shippingMethod, payment, items, totals, promo }.
   * Card details never leave this function in full: only brand and last four digits are kept.
   * Sample-data mode: a card ending in 0002 is declined, to exercise the error state.
   */
  async placeOrder(payload) {
    if (!USE_MOCK_DATA) {
      const { data } = await api.post('/orders', payload);
      return data;
    }

    await mockDelay(null, 1600);
    if (payload.payment.method === 'card' && payload.payment.cardNumber.replace(/\D/g, '').endsWith('0002')) {
      return reject('card_declined', 'Your card was declined. Please check the details, or use a different card or payment method.');
    }

    const { cardNumber, ...payment } = payload.payment;
    const order = {
      id: newOrderId(),
      createdAt: new Date().toISOString(),
      status: 'Processing',
      ...payload,
      payment: { ...payment, last4: cardNumber ? cardNumber.replace(/\D/g, '').slice(-4) : null },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([order, ...readOrders()].slice(0, 50)));
    return order;
  },

  async getOrder(id) {
    if (!USE_MOCK_DATA) {
      const { data } = await api.get(`/orders/${id}`);
      return data;
    }
    return mockDelay(readOrders().find((order) => order.id === id) ?? null, 300);
  },

  /** Orders belonging to a signed-in user: placed while signed in, or as a guest with the same email. */
  async listOrders(user) {
    if (!USE_MOCK_DATA) {
      const { data } = await api.get('/me/orders');
      return data;
    }
    const mine = (order) => order.userId === user.id || order.contact?.email === user.email;
    const own = readOrders().filter(mine);
    const seeded = user.id === 'u-demo' ? DEMO_ORDERS.filter((demo) => !own.some((order) => order.id === demo.id)) : [];
    const all = [...own, ...seeded].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return mockDelay(all, 500);
  },

  /** Cancels an order that hasn't shipped yet. */
  async cancelOrder(id) {
    if (!USE_MOCK_DATA) {
      const { data } = await api.post(`/orders/${id}/cancel`);
      return data;
    }
    await mockDelay(null, 900);
    const orders = readOrders();
    const order = orders.find((item) => item.id === id);
    if (!order || order.status !== 'Processing') {
      return reject('not_cancellable', 'This order has already shipped, so it can’t be cancelled. You can return it once it arrives.');
    }
    const updated = { ...order, status: 'Cancelled', cancelledAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders.map((item) => (item.id === id ? updated : item))));
    return updated;
  },

  async getUserOrder(user, id) {
    const orders = await orderService.listOrders(user);
    return orders.find((order) => order.id === id) ?? null;
  },
};

/* ------------------------------------------------------------------ */
/* Order history for the demo account                                  */
/* ------------------------------------------------------------------ */

const DEMO_ADDRESS = {
  firstName: 'Ada',
  lastName: 'Okafor',
  address1: '14 Admiralty Way',
  address2: 'Flat 3B',
  city: 'Lekki Phase 1',
  region: 'Lagos',
  postalCode: '106104',
  country: 'NG',
};

function demoOrder({ id, createdAt, status, shippedAt, deliveredAt, tracking, items, promo }) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = promo ? Math.round(subtotal * promo.value) / 100 : 0;
  return {
    id,
    userId: 'u-demo',
    createdAt,
    status,
    shippedAt,
    deliveredAt,
    tracking,
    contact: { email: 'demo@nova.store', phone: '+234 803 555 0142', marketing: true },
    shippingAddress: DEMO_ADDRESS,
    billingAddress: DEMO_ADDRESS,
    shippingMethod: { id: 'express', label: 'Express', eta: '1–2 business days' },
    estimatedDelivery: null,
    payment: { method: 'card', brand: 'visa', last4: '4242' },
    items,
    totals: { subtotal, discount, shipping: 0, total: Math.round((subtotal - discount) * 100) / 100 },
    promo: promo ?? null,
  };
}

const DEMO_ORDERS = [
  demoOrder({
    id: 'NV-8K2Q4D',
    createdAt: '2026-11-12T14:22:00.000Z',
    status: 'Shipped',
    shippedAt: '2026-11-13T09:10:00.000Z',
    tracking: { carrier: 'DHL Express', number: 'JD014600006281' },
    items: [
      { productId: 'p-104', slug: 'moto-leather-jacket', name: 'Moto Leather Jacket', image: '1551028719-00167b16eac5', price: 349, quantity: 1, color: null, size: 'M' },
      { productId: 'p-205', slug: 'insulated-steel-bottle', name: 'Insulated Steel Bottle', image: '1602143407151-7111542de6e8', price: 38, quantity: 2, color: null, size: null },
    ],
  }),
  demoOrder({
    id: 'NV-7H1M9C',
    createdAt: '2026-10-28T10:05:00.000Z',
    status: 'Delivered',
    shippedAt: '2026-10-29T08:40:00.000Z',
    deliveredAt: '2026-10-30T15:12:00.000Z',
    tracking: { carrier: 'DHL Express', number: 'JD014600005117' },
    items: [
      { productId: 'p-001', slug: 'aura-wireless-headphones', name: 'Aura Wireless Headphones', image: '1505740420928-5e560c06d30e', price: 249, quantity: 1, color: 'Midnight', size: null },
    ],
  }),
  demoOrder({
    id: 'NV-5D8R2A',
    createdAt: '2026-09-03T18:47:00.000Z',
    status: 'Delivered',
    shippedAt: '2026-09-04T11:00:00.000Z',
    deliveredAt: '2026-09-06T13:30:00.000Z',
    tracking: { carrier: 'GIG Logistics', number: 'GIG7731900428' },
    promo: { code: 'NOVA10', type: 'percent', value: 10, label: '10% off your order', minSubtotal: 0 },
    items: [
      { productId: 'p-304', slug: 'copper-pendant-light', name: 'Copper Pendant Light', image: '1540932239986-30128078f3c5', price: 199, quantity: 2, color: null, size: null },
      { productId: 'p-306', slug: 'ritual-body-care-set', name: 'Ritual Body Care Set', image: '1631729371254-42c2892f0e6e', price: 68, quantity: 1, color: null, size: null },
    ],
  }),
];
