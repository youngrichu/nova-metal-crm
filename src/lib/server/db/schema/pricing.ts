import { pgTable, text, timestamp, uuid, numeric, index } from "drizzle-orm/pg-core";
import { products } from "./catalog";
import { user } from "./users";

export const priceHistory = pgTable("price_history", {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => products.id),
  landingCost: numeric('landing_cost', { precision: 14, scale: 2 }).notNull(),
  marketPrice: numeric('market_price', { precision: 14, scale: 2 }).notNull(),
  recordedAt: timestamp('recorded_at').notNull().defaultNow(),
  reason: text('reason'),
  performedBy: text('performed_by').references(() => user.id)
}, (table) => ({
  productIdx: index('idx_price_history_product').on(table.productId)
}));
