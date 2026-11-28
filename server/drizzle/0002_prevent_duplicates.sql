-- Before the lowercase-email checks: normalise emails already stored. Older versions built deleted-account
-- placeholders from the user id (capitals), and anything written outside the API could differ too.
-- If two real accounts differ only in capitals, the users UPDATE fails on the unique email constraint and the
-- whole migration rolls back: merge or rename one of them by hand, then run the migration again.
UPDATE "users" SET "email" = lower(btrim("email")) WHERE "email" <> lower(btrim("email"));--> statement-breakpoint
UPDATE "orders" SET "email" = lower(btrim("email")) WHERE "email" <> lower(btrim("email"));--> statement-breakpoint
DELETE FROM "newsletter_subscribers" AS "mixed" USING "newsletter_subscribers" AS "lower"
  WHERE "mixed"."email" <> lower(btrim("mixed"."email")) AND "lower"."email" = lower(btrim("mixed"."email"));--> statement-breakpoint
UPDATE "newsletter_subscribers" SET "email" = lower(btrim("email")) WHERE "email" <> lower(btrim("email"));--> statement-breakpoint
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_product_id_products_id_fk";
--> statement-breakpoint
DROP INDEX "product_images_product_idx";--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "collection_products_position_idx" ON "collection_products" USING btree ("collection_slug","position");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_user_product_idx" ON "reviews" USING btree ("product_id","user_id") WHERE "reviews"."user_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_order_item_idx" ON "reviews" USING btree ("order_item_id") WHERE "reviews"."order_item_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "product_images_product_idx" ON "product_images" USING btree ("product_id","kind","position");--> statement-breakpoint
ALTER TABLE "newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_email_check" CHECK ("newsletter_subscribers"."email" = lower(btrim("newsletter_subscribers"."email")));--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_email_check" CHECK ("orders"."email" = lower(btrim("orders"."email")));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_check" CHECK ("users"."email" = lower(btrim("users"."email")));