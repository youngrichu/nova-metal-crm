import { pgTable, text, timestamp, boolean, uuid, integer, numeric, index } from "drizzle-orm/pg-core";
import { products } from "./catalog";
import { user } from "./users";

export const warehouses = pgTable("warehouses", {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  location: text('location'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const inventory = pgTable("inventory", {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => products.id),
  warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id),
  quantity: integer('quantity').notNull().default(0), // Count in pieces
  avgCostPerPiece: numeric('avg_cost_per_piece', { precision: 14, scale: 2 }).notNull().default('0.00'), // In ETB
  lastUpdated: timestamp('last_updated').notNull().defaultNow()
});

export const inventoryTransactions = pgTable("inventory_transactions", {
  id: uuid('id').primaryKey().defaultRandom(),
  inventoryId: uuid('inventory_id').notNull().references(() => inventory.id),
  transactionType: text('transaction_type').notNull(), // 'IN', 'OUT', 'ADJUSTMENT'
  quantityChange: integer('quantity_change').notNull(), // Positive or negative
  unitCost: numeric('unit_cost', { precision: 14, scale: 2 }), // Essential for stock-in valuation
  referenceDoc: text('reference_doc'), // GRN number, Invoice number, or Adjustment reason
  performedBy: text('performed_by').notNull().references(() => user.id),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow()
}, (table) => {
  return {
    inventoryIdx: index('idx_transactions_inventory').on(table.inventoryId),
    createdAtIdx: index('idx_transactions_created_at').on(table.createdAt)
  };
});

export const inventoryCounts = pgTable("inventory_counts", {
  id: uuid('id').primaryKey().defaultRandom(),
  warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id),
  status: text('status').notNull(), // 'DRAFT', 'IN_PROGRESS', 'RECONCILED', 'CLOSED'
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  performedBy: text('performed_by').notNull().references(() => user.id)
}, (table) => ({
  warehouseIdx: index('idx_inventory_counts_warehouse').on(table.warehouseId),
  statusIdx: index('idx_inventory_counts_status').on(table.status)
}));

export const inventoryCountItems = pgTable("inventory_count_items", {
  id: uuid('id').primaryKey().defaultRandom(),
  countId: uuid('count_id').notNull().references(() => inventoryCounts.id),
  productId: uuid('product_id').notNull().references(() => products.id),
  expectedQuantity: integer('expected_quantity').notNull(), // Captured at start of count
  physicalQuantity: integer('physical_quantity'), // Entered by staff
  notes: text('notes')
}, (table) => ({
  countIdIdx: index('idx_inventory_count_items_count_id').on(table.countId)
}));
