ALTER TABLE "price_history" ADD COLUMN "performed_by" text;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_performed_by_user_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_inventory_count_items_count_id" ON "inventory_count_items" USING btree ("count_id");