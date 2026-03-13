CREATE INDEX "idx_inventory_counts_warehouse" ON "inventory_counts" USING btree ("warehouse_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_counts_status" ON "inventory_counts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_price_history_product" ON "price_history" USING btree ("product_id");