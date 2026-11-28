-- Trigram matching for product search. Available on every major managed PostgreSQL (RDS, Cloud SQL,
-- Supabase, Neon, Render…); creating it may need the database owner's role.
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "rate_limits_reset_idx" ON "rate_limits" USING btree ("reset_at");--> statement-breakpoint
CREATE INDEX "products_search_idx" ON "products" USING gin (("name" || ' ' || "category_id" || ' ' || "description") gin_trgm_ops);