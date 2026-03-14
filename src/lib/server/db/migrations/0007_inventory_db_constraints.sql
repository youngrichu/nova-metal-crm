-- Enforce at the DB level that only one IN_PROGRESS count can exist per warehouse.
-- This makes the TOCTOU guard in startCount atomic under any isolation level.
CREATE UNIQUE INDEX "inventory_counts_warehouse_active_unique" ON "inventory_counts" ("warehouse_id") WHERE status = 'IN_PROGRESS';--> statement-breakpoint
-- Prevent duplicate product rows within the same count session.
CREATE UNIQUE INDEX "inventory_count_items_count_product_unique" ON "inventory_count_items" ("count_id", "product_id");--> statement-breakpoint
-- Restrict status to valid values so application bugs cannot write garbage data.
ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_status_check" CHECK (status IN ('IN_PROGRESS', 'CLOSED', 'CANCELLED'));
