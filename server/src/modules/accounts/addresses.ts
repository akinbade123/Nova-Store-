/**
 * docs/API.md, section 6. Every change returns the whole updated list, because the storefront
 * replaces its list with the response. There is always exactly one default when the list isn't empty.
 */
import { Hono } from 'hono';
import { and, asc, eq, ne } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '../../db/client.ts';
import { accessFor, withAccess } from '../../db/access.ts';
import { addresses } from '../../db/schema.ts';
import { newId } from '../../lib/crypto.ts';
import { ApiError, notFound } from '../../lib/errors.ts';
import { fields, readBody } from '../../lib/validate.ts';
import { COUNTRIES, validateAddress, validatePhone } from '../../shared.ts';
import type { AppEnv, Deps } from '../../types.ts';
import { requireAuth } from './sessions.ts';

const COUNTRY_CODES = COUNTRIES.map((country: { code: string }) => country.code);

/** Field shape here; the address rules themselves are the storefront's own validateAddress and validatePhone. */
const addressBody = z
  .object({
    label: z.string().trim().min(1, 'Choose a label, like Home').max(40),
    firstName: z.string().trim().max(100).default(''),
    lastName: z.string().trim().max(100).default(''),
    address1: z.string().trim().max(200).default(''),
    address2: fields.optionalText(200),
    city: z.string().trim().max(100).default(''),
    region: fields.optionalText(100),
    postalCode: fields.optionalText(20),
    country: z.string().refine((code) => COUNTRY_CODES.includes(code), 'Choose a country we deliver to'),
    phone: fields.optionalText(40),
    isDefault: z.boolean().optional().default(false),
  })
  .superRefine((address, ctx) => {
    const errors: Record<string, string> = {};
    validateAddress({ ...address, region: address.region ?? '', postalCode: address.postalCode ?? '' }, '', errors);
    const phone = validatePhone(address.phone);
    if (phone) errors.phone = phone;
    for (const [path, message] of Object.entries(errors)) ctx.addIssue({ code: 'custom', path: [path], message });
  });

type AddressRow = typeof addresses.$inferSelect;

const toAddress = (row: AddressRow) => ({
  id: row.id,
  label: row.label,
  firstName: row.firstName,
  lastName: row.lastName,
  address1: row.address1,
  address2: row.address2,
  city: row.city,
  region: row.region,
  postalCode: row.postalCode,
  country: row.country,
  phone: row.phone,
  isDefault: row.isDefault,
});

const listFor = async (db: Db, userId: string) =>
  (await db.select().from(addresses).where(eq(addresses.userId, userId)).orderBy(asc(addresses.createdAt), asc(addresses.id))).map(toAddress);

/**
 * Makes exactly one address the default: `preferredId` if given, else the current default, else the first.
 * Clears the others first, so the one-default index is never violated mid-way.
 */
async function normaliseDefault(db: Db, userId: string, preferredId?: string) {
  const list = await db
    .select({ id: addresses.id, isDefault: addresses.isDefault })
    .from(addresses)
    .where(eq(addresses.userId, userId))
    .orderBy(asc(addresses.createdAt), asc(addresses.id));
  if (!list.length) return;
  const target = preferredId ?? list.find((item) => item.isDefault)?.id ?? list[0]!.id;
  await db.update(addresses).set({ isDefault: false }).where(and(eq(addresses.userId, userId), ne(addresses.id, target)));
  await db.update(addresses).set({ isDefault: true }).where(eq(addresses.id, target));
}

const addressNotFound = () => notFound('We couldn’t find that address.');
const MAX_ADDRESSES = 20;

export function addressRoutes(deps: Deps) {
  const { db } = deps;
  const app = new Hono<AppEnv>();
  app.use('/me/addresses', requireAuth(deps));
  app.use('/me/addresses/*', requireAuth(deps));

  // Each handler runs as the signed-in user, so the database's row-level policies also limit it to
  // their addresses (the WHERE clauses below already do; the policies are the second lock).
  app.get('/me/addresses', async (c) => c.json(await withAccess(db, accessFor(c.get('user')), (tx) => listFor(tx, c.get('user').id))));

  app.post('/me/addresses', async (c) => {
    const userId = c.get('user').id;
    const { isDefault, ...address } = await readBody(c, addressBody);
    const list = await withAccess(db, accessFor(c.get('user')), async (tx) => {
      const existing = await listFor(tx, userId);
      if (existing.length >= MAX_ADDRESSES) {
        throw new ApiError(422, 'validation_failed', `You can save up to ${MAX_ADDRESSES} addresses. Delete one to add another.`);
      }
      const id = newId('addr-', 10);
      // Inserted as not-default, then normalised, so the one-default index holds throughout.
      await tx.insert(addresses).values({ ...address, id, userId, isDefault: false });
      await normaliseDefault(tx, userId, isDefault || existing.length === 0 ? id : undefined);
      return listFor(tx, userId);
    });
    return c.json(list, 201);
  });

  app.put('/me/addresses/:id', async (c) => {
    const userId = c.get('user').id;
    const id = c.req.param('id');
    const { isDefault, ...address } = await readBody(c, addressBody);
    const list = await withAccess(db, accessFor(c.get('user')), async (tx) => {
      const changes = isDefault ? address : { ...address, isDefault: false };
      const [updated] = await tx
        .update(addresses)
        .set({ ...changes, updatedAt: new Date() })
        .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
        .returning({ id: addresses.id });
      if (!updated) throw addressNotFound();
      await normaliseDefault(tx, userId, isDefault ? id : undefined);
      return listFor(tx, userId);
    });
    return c.json(list);
  });

  app.delete('/me/addresses/:id', async (c) => {
    const userId = c.get('user').id;
    const list = await withAccess(db, accessFor(c.get('user')), async (tx) => {
      const [deleted] = await tx
        .delete(addresses)
        .where(and(eq(addresses.id, c.req.param('id')), eq(addresses.userId, userId)))
        .returning({ id: addresses.id });
      if (!deleted) throw addressNotFound();
      await normaliseDefault(tx, userId);
      return listFor(tx, userId);
    });
    return c.json(list);
  });

  app.post('/me/addresses/:id/default', async (c) => {
    const userId = c.get('user').id;
    const id = c.req.param('id');
    const list = await withAccess(db, accessFor(c.get('user')), async (tx) => {
      const [found] = await tx.select({ id: addresses.id }).from(addresses).where(and(eq(addresses.id, id), eq(addresses.userId, userId)));
      if (!found) throw addressNotFound();
      await normaliseDefault(tx, userId, id);
      return listFor(tx, userId);
    });
    return c.json(list);
  });

  return app;
}
