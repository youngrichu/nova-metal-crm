import { pgTable, text, timestamp, boolean, uuid, integer, numeric } from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  prefix: text('prefix').notNull().unique(), // e.g. "RHS" for Rectangular Hollow Section
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const products = pgTable("products", {
  id: uuid('id').primaryKey().defaultRandom(),
  categoryId: uuid('category_id').notNull().references(() => categories.id),
  sku: text('sku').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  thickness: numeric('thickness', { precision: 10, scale: 2 }), // e.g., 1.5, in mm
  size1: numeric('size_1', { precision: 10, scale: 2 }), // e.g., 20, in mm
  size2: numeric('size_2', { precision: 10, scale: 2 }), // e.g., 30, in mm (optional for square/round)
  length: numeric('length', { precision: 10, scale: 2 }), // e.g., 6000, in mm (6m standard usually)
  weightPerPiece: numeric('weight_per_piece', { precision: 10, scale: 3 }), // Estimated or standard weight in kg
  isActive: boolean('is_active').notNull().default(true),
  minStockLevel: integer('min_stock_level').notNull().default(10),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});
