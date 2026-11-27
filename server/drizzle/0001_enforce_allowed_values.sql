ALTER TABLE "collections" ADD CONSTRAINT "collections_tone_check" CHECK ("collections"."tone" IN ('dark', 'light'));--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_price_check" CHECK ("order_items"."unit_price_cents" >= 0);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_status_check" CHECK ("orders"."status" IN ('pending_payment', 'payment_failed', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'));--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_payment_method_check" CHECK ("orders"."payment_method" IN ('card', 'paypal', 'applepay'));--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_currency_check" CHECK ("orders"."currency" ~ '^[A-Z]{3}$');--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_totals_check" CHECK ("orders"."subtotal_cents" >= 0 AND "orders"."discount_cents" BETWEEN 0 AND "orders"."subtotal_cents" AND "orders"."shipping_cents" >= 0
        AND "orders"."total_cents" = "orders"."subtotal_cents" - "orders"."discount_cents" + "orders"."shipping_cents");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_check" CHECK ("orders"."delivery_max_date" >= "orders"."delivery_min_date");--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_kind_check" CHECK ("product_images"."kind" IN ('card', 'gallery'));--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_size_guide_check" CHECK ("products"."size_guide" IS NULL OR "products"."size_guide" IN ('apparel', 'shoes'));--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_rating_check" CHECK ("products"."rating_avg" BETWEEN 0 AND 5 AND "products"."review_count" >= 0);--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_type_check" CHECK ("promotions"."type" IN ('percent', 'shipping'));--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_value_check" CHECK (("promotions"."type" = 'percent' AND "promotions"."value" BETWEEN 1 AND 100) OR ("promotions"."type" = 'shipping' AND "promotions"."value" = 0));--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_amounts_check" CHECK ("promotions"."min_subtotal_cents" >= 0 AND "promotions"."redemptions" >= 0 AND ("promotions"."max_redemptions" IS NULL OR "promotions"."max_redemptions" > 0));--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_dates_check" CHECK ("promotions"."starts_at" IS NULL OR "promotions"."ends_at" IS NULL OR "promotions"."ends_at" > "promotions"."starts_at");--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_status_check" CHECK ("reviews"."status" IN ('pending', 'approved', 'rejected'));--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_helpful_check" CHECK ("reviews"."helpful_count" >= 0);--> statement-breakpoint
ALTER TABLE "shipping_methods" ADD CONSTRAINT "shipping_methods_price_check" CHECK ("shipping_methods"."price_cents" >= 0 AND ("shipping_methods"."free_over_cents" IS NULL OR "shipping_methods"."free_over_cents" >= 0));--> statement-breakpoint
ALTER TABLE "shipping_methods" ADD CONSTRAINT "shipping_methods_days_check" CHECK ("shipping_methods"."min_days" >= 0 AND "shipping_methods"."max_days" >= "shipping_methods"."min_days");--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_status_check" CHECK ("support_messages"."status" IN ('open', 'closed'));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_check" CHECK ("users"."role" IN ('customer', 'admin'));