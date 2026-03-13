import { pgTable, text, timestamp, uuid, numeric, index } from "drizzle-orm/pg-core";
import { user } from "./users";
import { products } from "./catalog";

export const customers = pgTable("customers", {
  id: uuid('id').primaryKey().defaultRandom(),
  tinNumber: text('tin_number').unique(), // Tax ID
  name: text('name').notNull(),
  contactPerson: text('contact_person'),
  phone: text('phone'),
  whatsapp: text('whatsapp'),
  email: text('email'),
  companyName: text('company_name'),
  customerType: text('customer_type').notNull().default('INDIVIDUAL'), // 'WORKSHOP' | 'INDIVIDUAL'
  pricingTier: text('pricing_tier').notNull().default('RETAIL'), // 'RETAIL' | 'WHOLESALE' | 'VIP'
  notes: text('notes'),
  address: text('address'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const salesOrders = pgTable("sales_orders", {
  id: uuid('id').primaryKey().defaultRandom(),
  orderNumber: text('order_number').notNull().unique(), // E.g., SO-2026-0001
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  status: text('status').notNull().default('DRAFT'), // DRAFT, QUOTE, CONFIRMED, INVOICED, CANCELLED
  validUntil: timestamp('valid_until'), // For Quotations lock-in period
  subtotal: numeric('subtotal', { precision: 14, scale: 2 }).notNull().default('0.00'),
  taxAmount: numeric('tax_amount', { precision: 14, scale: 2 }).notNull().default('0.00'), // 15% VAT usually
  totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
  discountAmount: numeric('discount_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
  createdBy: text('created_by').notNull().references(() => user.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => {
  return {
    customerIdx: index('idx_sales_customer').on(table.customerId),
    statusIdx: index('idx_sales_status').on(table.status),
    createdAtIdx: index('idx_sales_created_at').on(table.createdAt)
  };
});

export const salesOrderItems = pgTable("sales_order_items", {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => salesOrders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id),
  quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 14, scale: 2 }).notNull(), // Price per piece at time of sale
  discountPercent: numeric('discount_percent', { precision: 5, scale: 2 }).notNull().default('0.00'), // Bulk discount applied
  lineTotal: numeric('line_total', { precision: 14, scale: 2 }).notNull() // (unitPrice * quantity) * (1 - discountPercent)
});

export const payments = pgTable("payments", {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => salesOrders.id),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  paymentMethod: text('payment_method').notNull(), // CASH, BANK_TRANSFER, TELEBIRR, CHEQUE
  referenceNumber: text('reference_number'), // Bank transaction ID or Cheque number
  recordedBy: text('recorded_by').notNull().references(() => user.id),
  paymentDate: timestamp('payment_date').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow()
}, (table) => {
  return {
    orderIdx: index('idx_payment_order').on(table.orderId)
  };
});

export const dailyReconciliations = pgTable("daily_reconciliations", {
  id: uuid('id').primaryKey().defaultRandom(),
  date: timestamp('date').notNull().unique(), // The operational day being closed
  totalSales: numeric('total_sales', { precision: 14, scale: 2 }).notNull().default('0.00'),
  totalProfit: numeric('total_profit', { precision: 14, scale: 2 }).notNull().default('0.00'), // Revenue - Landing Cost
  expectedCash: numeric('expected_cash', { precision: 14, scale: 2 }).notNull().default('0.00'),
  actualCash: numeric('actual_cash', { precision: 14, scale: 2 }).notNull().default('0.00'),
  discrepancy: numeric('discrepancy', { precision: 14, scale: 2 }).notNull().default('0.00'),
  notes: text('notes'),
  closedBy: text('closed_by').notNull().references(() => user.id),
  createdAt: timestamp('created_at').notNull().defaultNow()
});
