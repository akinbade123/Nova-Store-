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