ALTER TABLE "sales_orders" ALTER COLUMN "customer_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD COLUMN "walk_in_phone" text;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD COLUMN "walk_in_pricing_tier" text;
