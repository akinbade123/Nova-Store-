/**
 * docs/API.md, section 8: reading orders. Placing and cancelling orders need the payment provider,
 * so they answer 501 until the next phase (quote, payment hand-off, webhook).
 */
import { Hono } from 'hono';
import { and, asc, desc, eq, inArray, notInArray, or } from 'drizzle-orm';
import type { Db } from '../../db/client.ts';
import { orderItems, orders } from '../../db/schema.ts';
import { sha256 } from '../../lib/crypto.ts';
import { ApiError, notFound } from '../../lib/errors.ts';
import { toDollars } from '../../lib/money.ts';
import type { AppEnv, Deps, UserRow } from '../../types.ts';
import { authenticate, requireAuth } from '../accounts/sessions.ts';

type OrderRow = typeof orders.$inferSelect;
type ItemRow = typeof orderItems.$inferSelect;

/**
 * The storefront shows exactly four labels (docs/DATA_MODEL.md, "Statuses").
 * pending_payment and payment_failed are only seen by the buyer looking at that one order.
 */
const STATUS_LABEL: Record<OrderRow['status'], 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled'> = {
  pending_payment: 'Processing',
  payment_failed: 'Cancelled',
  paid: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Cancelled',
};
const HIDDEN_FROM_HISTORY: OrderRow['status'][] = ['pending_payment', 'payment_failed'];

// The same short en-GB format the storefront uses (deliveryWindow in src/utils/format.js).
const shortDate = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const deliveryWindow = (min: string, max: string) => `${shortDate.format(new Date(min))} – ${shortDate.format(new Date(max))}`;
const iso = (value: Date | null) => value?.toISOString() ?? null;

/** docs/API.md, "Order". */
export const toOrder = (order: OrderRow, items: ItemRow[]) => ({
  id: order.id,
  userId: order.userId,
  createdAt: order.createdAt.toISOString(),
  status: STATUS_LABEL[order.status],
  shippedAt: iso(order.shippedAt),
  deliveredAt: iso(order.deliveredAt),
  cancelledAt: iso(order.cancelledAt),
  tracking: order.trackingCarrier && order.trackingNumber ? { carrier: order.trackingCarrier, number: order.trackingNumber } : null,
  contact: { email: order.email, phone: order.phone, marketing: order.marketing },
  shippingAddress: order.shippingAddress,
  billingAddress: order.billingAddress,
  shippingMethod: { id: order.shippingMethodId, label: order.shippingLabel, eta: order.shippingEta },
  estimatedDelivery: deliveryWindow(order.deliveryMinDate, order.deliveryMaxDate),
  payment: { method: order.paymentMethod, brand: order.paymentBrand, last4: order.paymentLast4 },
  items: items.map((item) => ({
    productId: item.productId,
    slug: item.slug,
    name: item.name,
    image: item.imageUrl,
    price: toDollars(item.unitPriceCents),
    quantity: item.quantity,
    color: item.color,
    size: item.size,
  })),
  totals: {
    subtotal: toDollars(order.subtotalCents),
    discount: toDollars(order.discountCents),
    shipping: toDollars(order.shippingCents),
    total: toDollars(order.totalCents),
  },
  promo: order.promo,
});

async function withItems(db: Db, rows: OrderRow[]) {
  if (!rows.length) return [];
  const items = await db
    .select()
    .from(orderItems)
    .where(inArray(orderItems.orderId, rows.map((row) => row.id)))
    .orderBy(asc(orderItems.id));
  const byOrder = Map.groupBy(items, (item) => item.orderId);
  return rows.map((row) => toOrder(row, byOrder.get(row.id) ?? []));
}

/** A user's orders: placed while signed in, or as a guest with the same email once that email is verified. */
const ownedBy = (user: UserRow) =>
  user.emailVerifiedAt ? or(eq(orders.userId, user.id), eq(orders.email, user.email)) : eq(orders.userId, user.id);

const notYet = () =>
  new ApiError(501, 'not_implemented', 'Checkout isn’t available yet. Please try again soon.');

export function orderRoutes(deps: Deps) {
  const { db } = deps;
  const app = new Hono<AppEnv>();

  app.get('/me/orders', requireAuth(deps), async (c) => {
    const user = c.get('user');
    const rows = await db
      .select()
      .from(orders)
      .where(and(ownedBy(user), notInArray(orders.status, HIDDEN_FROM_HISTORY)))
      .orderBy(desc(orders.createdAt));
    return c.json(await withItems(db, rows));
  });

  // Owners see their own orders; guests need the order's access token. Anyone else gets not_found,
  // never forbidden, so the API doesn't reveal that an order exists.
  app.get('/orders/:id', async (c) => {
    const missing = notFound('We couldn’t find that order.');
    const [order] = await db.select().from(orders).where(eq(orders.id, c.req.param('id'))).limit(1);
    if (!order) throw missing;
    const token = c.req.query('token');
    const auth = await authenticate(db, c);
    const isGuest = Boolean(token && order.guestTokenHash && sha256(token) === order.guestTokenHash);
    const isOwner =
      auth != null && (order.userId === auth.user.id || (auth.user.emailVerifiedAt != null && order.email === auth.user.email));
    if (!isGuest && !isOwner) throw missing;
    const [result] = await withItems(db, [order]);
    return c.json(result);
  });

  app.post('/orders', () => {
    throw notYet();
  });
  app.post('/orders/:id/cancel', () => {
    throw notYet();
  });

  return app;
}
