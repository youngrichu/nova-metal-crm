ALTER TABLE "customers" ADD COLUMN "whatsapp" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "company_name" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "customer_type" text DEFAULT 'INDIVIDUAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "pricing_tier" text DEFAULT 'STANDARD' NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "notes" text;