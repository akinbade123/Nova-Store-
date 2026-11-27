-- Row-level security: the database itself limits each request to the signed-in user's rows, as a
-- second lock behind the API's own ownership checks. See docs/DATA_MODEL.md, "Row-level security".
--
-- The API runs as the restricted role nova_app (src/db/roles.ts), which these policies apply to.
-- The tables' owner, used only for migrations and admin work, isn't subject to them.
--
-- Each request says who it's acting for with transaction-local settings (src/db/access.ts):
--   app.user_id      the signed-in user's id
--   app.user_email   their email, only once verified (guest orders placed with it become theirs)
--   app.order_token  the SHA-256 of a guest order's access token
-- An unset or empty setting matches nothing, so a query without them sees no private rows.

CREATE FUNCTION app_setting(name text) RETURNS text
  LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting(name, true), '') $$;
--> statement-breakpoint

-- Addresses: only the owner, for everything.
ALTER TABLE "addresses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "addresses_owner" ON "addresses"
  USING ("user_id" = app_setting('app.user_id'))
  WITH CHECK ("user_id" = app_setting('app.user_id'));--> statement-breakpoint

-- Orders: read by the account that placed them, by a verified owner of the email, or with the guest
-- token. Updated only by their owner (anonymising on account deletion clears user_id, hence the
-- open WITH CHECK). Never deleted: accounting needs them, and nova_app has no DELETE on orders.
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "orders_read" ON "orders" FOR SELECT
  USING (
    "user_id" = app_setting('app.user_id')
    OR "email" = app_setting('app.user_email')
    OR "guest_token_hash" = app_setting('app.order_token')
  );--> statement-breakpoint
CREATE POLICY "orders_place" ON "orders" FOR INSERT
  WITH CHECK ("user_id" IS NULL OR "user_id" = app_setting('app.user_id'));--> statement-breakpoint
CREATE POLICY "orders_change_own" ON "orders" FOR UPDATE
  USING ("user_id" = app_setting('app.user_id'))
  WITH CHECK (true);--> statement-breakpoint

-- Order lines: visible and writable exactly when their order is (the subquery applies the orders policies).
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "order_items_with_order" ON "order_items"
  USING (EXISTS (SELECT 1 FROM "orders" o WHERE o."id" = "order_items"."order_id"))
  WITH CHECK (EXISTS (SELECT 1 FROM "orders" o WHERE o."id" = "order_items"."order_id"));--> statement-breakpoint

-- Users: anyone may be looked up (sign-in and registration happen before anyone is signed in) and
-- register, but an account can only be changed while acting as that account. Never deleted:
-- deleting an account anonymises the row.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "users_read" ON "users" FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY "users_register" ON "users" FOR INSERT WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "users_change_own" ON "users" FOR UPDATE
  USING ("id" = app_setting('app.user_id'))
  WITH CHECK ("id" = app_setting('app.user_id'));--> statement-breakpoint

-- Support messages: the API can file them but never read them back. Support staff read them with
-- their own role.
ALTER TABLE "support_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "support_messages_submit" ON "support_messages" FOR INSERT WITH CHECK (true);
