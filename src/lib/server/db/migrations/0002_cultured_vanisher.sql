CREATE TABLE "daily_reconciliations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" timestamp NOT NULL,
	"total_sales" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"total_profit" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"expected_cash" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"actual_cash" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"discrepancy" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"notes" text,
	"closed_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "daily_reconciliations_date_unique" UNIQUE("date")
);
--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "pricing_tier" SET DEFAULT 'RETAIL';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "average_landing_cost" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_order_items" ADD COLUMN "discount_percent" numeric(5, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD COLUMN "valid_until" timestamp;--> statement-breakpoint
ALTER TABLE "daily_reconciliations" ADD CONSTRAINT "daily_reconciliations_closed_by_user_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;