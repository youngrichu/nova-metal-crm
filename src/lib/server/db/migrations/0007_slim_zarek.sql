ALTER TABLE "sales_orders" ALTER COLUMN "customer_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD COLUMN "walk_in_phone" text;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD COLUMN "walk_in_pricing_tier" text;--> statement-breakpoint
CREATE INDEX "idx_sales_orders_walk_in_phone" ON "sales_orders" ("walk_in_phone") WHERE "walk_in_phone" IS NOT NULL;
