# Nova Metal CRM — User Guide

> **For:** Admin Staff · Salespeople · Warehouse Operators
> **Version:** 1.0 · March 2026

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard](#2-dashboard)
3. [Sales — Orders & Payments](#3-sales--orders--payments)
4. [Customers](#4-customers)
5. [Inventory](#5-inventory)
6. [System Settings](#6-system-settings-admin-only)
7. [User Management](#7-user-management-admin-only)

---

## Role Quick Reference

Every user has one of three roles. The table below shows what each role can access.

| Feature | Admin | Sales | Warehouse |
|---|:---:|:---:|:---:|
| Dashboard (KPIs & revenue) | ✅ | ✅ | ⬜ (counts only) |
| Sales Orders | ✅ | ✅ | ❌ |
| Customers | ✅ | ✅ | ❌ |
| Reconciliation | ✅ | ✅ | ❌ |
| Products & Categories | ✅ | ❌ | ✅ |
| Inventory & Warehouses | ✅ | ❌ | ✅ |
| Stock Takes | ✅ | ❌ | ✅ |
| System Settings | ✅ | ❌ | ❌ |
| User Management | ✅ | ❌ | ❌ |

---

## 1. Getting Started

### How to log in

1. Open your browser and go to `http://localhost:3000` (or the address your IT contact provided).
2. Enter your **Email** and **Password**.
3. Click **Sign In**.

You will be taken directly to the Dashboard.

### How to log out

Click your name or avatar in the bottom-left corner of the sidebar, then select **Sign Out**.

### Navigating the system

The sidebar on the left is your main navigation. It shows only the sections your role can access. On smaller screens, tap the menu icon (☰) to open it.

---

## 2. Dashboard

The Dashboard gives you a live snapshot of the business. It is the first screen you see after logging in.

### Reading the Inventory Overview panel

The **Inventory Overview** panel on the left shows:

| Metric | What it means |
|---|---|
| **Total Products** | Number of products in the catalogue |
| **Storage Depots** | Number of active warehouses |
| **Inventory Alerts** | Products at or below their minimum stock level |
| **Active Orders** | Orders currently in QUOTE or CONFIRMED status |
| **Total Revenue** | Sum of all non-cancelled, non-draft orders in the selected period *(admin & sales only)* |
| **Total Profit** | Revenue minus purchase costs for the same period *(admin & sales only)* |
| **Margin by Category** | Gross profit % per product category *(admin & sales only)* |

> **Warehouse staff** see counts and alerts but not revenue or profit figures.

### Filtering by date range

Use the controls in the top-right corner of the page header:

- **Day / Week / Month toggle** — controls how the Revenue Trajectory chart groups data points.
- **Date range dropdown** — limits all metrics and the chart to the chosen window:
  - Last 7 Days
  - Last 30 Days
  - This Month
  - Last Month
  - Last Quarter
  - Current Quarter
  - This Year

The selected filter is saved in the URL, so you can bookmark a specific view.

### Reading the Revenue Trajectory chart

The chart shows revenue over time for the selected period. Each dot is one data point (day, week, or month depending on your toggle). Hover near a dot to see the exact date.

### System Telemetry feed

The bottom-left panel shows the 5 most recent stock movements (stock-in, stock-out, or adjustment), including the product, warehouse, and quantity change.

### Critical Deficits panel

The bottom-right panel lists every product whose current stock is at or below its minimum stock level. The number shown is *current quantity / minimum threshold* (e.g., `3 / 10` means 3 in stock, minimum is 10).

---

## 3. Sales — Orders & Payments

*Available to: Admin, Sales*

### How to create a sales order

1. In the sidebar, go to **Sales**.
2. Click **New Order** (top-right button).
3. **Choose the customer mode** using the **Registered / Walk-In** toggle:

   **Registered customer:**
   - Keep the **Registered** tab selected (default).
   - Search for and select the customer from the combobox. The pricing tier is read automatically from their profile.

   **Walk-in customer (no account):**
   - Click the **Walk-In** tab.
   - Select the **Pricing Tier** — **RETAIL**, **WHOLESALE**, **VIP**, or **PREFERRED** — using the tier buttons. The unit prices update immediately.
   - Optionally enter a **Phone** number so the order can be linked to a customer account later.

4. **Add products:**
   - Click **Add Item**.
   - Select a product from the dropdown — the unit price is calculated automatically based on the pricing tier.
   - Enter the **Quantity**.
   - Repeat for each product.
5. Review the **Subtotal**, **VAT**, and **Total** at the bottom.
6. Click **Save Order**.

The order is created in **DRAFT** status.

> **Tip:** Unit prices are locked at the moment the order is created. Changing system settings later does not affect existing orders.

---

### How prices are calculated

Every product has a **purchase cost** — the average price the business paid to stock it. The unit price shown to the customer is the purchase cost multiplied by a **markup** that depends on the customer's pricing tier.

**VAT (15%) is added on top of the order subtotal — it is not part of the unit price.**

#### Pricing tiers

**For orders with a registered customer:**

- **Standard (Retail)** — the normal selling price. Applied to occasional or first-time customers. Unit price = purchase cost + 15%.
- **Preferred** — a loyalty discount for customers who buy regularly. Unit price = purchase cost + 8%.
- **VIP (Wholesale)** — the lowest price, reserved for high-volume buyers or established business accounts. Unit price = purchase cost + 5%.

**For walk-in orders (no customer account):**

- **RETAIL** — the normal selling price, same rate as Standard (Retail). Use this for any customer you do not recognise as a regular.
- **PREFERRED** — use this when you know the customer is a regular buyer but their details have not been saved in the system yet. Same rate as the Preferred tier (+8%).
- **WHOLESALE** — use this for bulk or business buyers who do not have an account. Same rate as VIP (Wholesale) (+5%).
- **VIP** — an alternative wholesale label for walk-in buyers, identical in price to WHOLESALE (+5%).

#### Order total formula

- **Unit Price** = `Purchase Cost × Markup`
- **Subtotal** = sum of all line totals (`Unit Price × Quantity`)
- **VAT** = `Subtotal × 15%`
- **Order Total** = `Subtotal + VAT`

**Example** — Standard (Retail) customer, product purchase cost ETB 100, qty 10:
- Unit price = 100 × 1.15 = **ETB 115.00**
- Subtotal = 115.00 × 10 = **ETB 1,150.00**
- VAT (15%) = **ETB 172.50**
- **Total = ETB 1,322.50**

> Markup rates can be adjusted by an Admin under **Settings → System → Pricing Configuration**.

---

### Understanding order statuses

| Status | Meaning | Next steps |
|---|---|---|
| **DRAFT** | Work in progress, not yet sent to customer | Convert to Quote or Confirm directly |
| **QUOTE** | Sent to customer, price is locked | Confirm or Cancel |
| **CONFIRMED** | Customer has agreed — record payments, generate invoice | Invoice or Cancel |
| **INVOICED** | Final — included in daily reconciliation | No further changes |
| **CANCELLED** | Abandoned | Terminal state |

---

### How to advance an order through the workflow

1. Open the order from **Sales → Orders**.
2. In the **Workflow Actions** panel on the right, click the appropriate button:
   - **Convert to Quote** — moves DRAFT → QUOTE
   - **Confirm Order** — moves to CONFIRMED
   - **Generate Invoice** — moves CONFIRMED → INVOICED
   - **Cancel Order** — available from DRAFT, QUOTE, or CONFIRMED

---

### How to record a payment

Payments can only be recorded on **CONFIRMED** or **INVOICED** orders.

1. Open the order.
2. Click **Record Payment** in the Workflow Actions panel.
3. Fill in:
   - **Amount** (ETB)
   - **Payment Method**: Cash, Bank Transfer, Telebirr, or Cheque
   - **Reference Number** (optional — bank transaction ID, cheque number, etc.)
4. Click **Save Payment**.

The payment is added to the order's payment history. You can record multiple partial payments.

---

### How to download a PDF invoice

1. Open the order.
2. Click **PDF Invoice** in the top-right header buttons.
3. The PDF opens in a new browser tab. Use your browser's print or download button to save it.

> Orders in QUOTE or DRAFT status generate a **Quotation** document. INVOICED orders generate a full **Invoice**.

---

### How to print a thermal receipt

1. Open the order.
2. Click **Print Receipt** in the top-right header buttons.
3. The receipt is sent directly to the configured thermal printer.

> If the printer is not reachable, an error message will describe the problem (e.g., "connection refused" or "timed out"). Contact your system administrator to check the printer settings.

---

### How to search and filter orders

On the **Sales → Orders** list page:

- Use the **search box** to find orders by order number, customer name, company name, or walk-in phone number.
- Orders are sorted newest first by default.

---

### How to do the daily cash reconciliation

Run this at the end of each working day.

1. Go to **Sales → Reconciliation**.
2. The system shows the **Expected Cash** — the total of all payments recorded today.
3. Count the physical cash and enter the **Actual Cash** amount.
4. The **Discrepancy** is calculated automatically (Actual − Expected).
5. Add a **Note** if there is a discrepancy (e.g., "Short ETB 50 — change error on order SO-2026-0012").
6. Click **Save Reconciliation**.

> Only one reconciliation can be saved per calendar day. Once saved, it cannot be edited.

---

## 4. Customers

*Available to: Admin, Sales*

### How to create a customer

1. Go to **Customers**.
2. Click **New Customer**.
3. Fill in at minimum:
   - **Name** (required)
   - **Pricing Tier** — Standard (Retail), Preferred (+8% markup), or VIP (Wholesale) (determines markup applied to their orders)
4. Optionally add:
   - Company Name, Primary Phone, WhatsApp Number, Email
   - TIN Number (required for VAT-registered businesses)
   - Customer Type: Individual Walk-in, Fabrication Workshop, or Enterprise / B2B
   - Address and Internal Annotations
5. Click **Save**.

---

### How to link walk-in orders to a customer

If orders were placed by a walk-in customer who later registers:

1. Open the customer's profile.
2. If the customer's phone matches any unlinked walk-in orders, a prompt will appear asking you to link them.
3. Select the orders you want to link and confirm.

> The original unit prices on the orders are preserved — linking does not recalculate any amounts.

---

### How to search for a customer

On the Customers list page, use the search box. It matches against the customer's **name**, **phone number**, and **TIN**.

---

## 5. Inventory

*Available to: Admin, Warehouse*

> **Note:** When an order is moved to **INVOICED**, the system automatically records a Stock Out for each item using the sales order number as the reference. Manual Stock Out entries are still used for goods dispatched before invoicing, supplier returns, damage adjustments, and other corrections.

### How to record a stock movement

1. Go to **Inventory**.
2. Click **Record Transaction**.
3. Select the **Transaction Type**:
   - **Stock In** — goods received from a supplier and added to the warehouse
   - **Stock Out** — goods physically dispatched to a customer. For invoiced sales orders, this is recorded automatically. Use manual Stock Out for pre-invoice dispatches, returns, or transfers.
   - **Adjustment** — corrections for damage, loss, or count discrepancies
4. Select the **Product** and **Target Warehouse**.
5. Enter the **Quantity**.
6. For **Stock In**, you may enter the **Purchase Cost (ETB)** per piece. This updates the product's running average purchase cost used in profit calculations.
7. Optionally enter a **Ref Document** (GRN number, sales order number, or reason).
8. Click **Save**.

> **Stock Out** will be rejected if there is insufficient quantity in the selected warehouse.

---

### How to manage warehouses

1. Go to **Inventory → Warehouses**.
2. Click **New Warehouse** to add a storage location.
3. Enter the **Depot Name** and **Physical Address**.
4. Click **Save**.

---

### How to perform a stock take

A stock take lets you physically count all items in a warehouse and reconcile with the system.

**Step 1 — Start the count**

1. Go to **Inventory → Stock Takes**.
2. Click **Start New Count**.
3. Select the **Warehouse** to count.
4. Click **Start**. The system takes a snapshot of expected quantities.

**Step 2 — Enter physical counts**

1. The count session opens showing all products in the warehouse.
2. For each product, enter the **Physical Quantity** you counted.
3. Optionally add a **Note** per item (e.g., "2 units damaged").
4. Click **Save** after each item, or navigate freely — your entries are saved individually.

**Step 3 — Review and close**

1. Once all items are counted, click **Review & Close**.
2. The reconciliation screen shows a summary of surpluses and shortages.
3. Review the discrepancies. When satisfied, click **Close Count**.
4. The system automatically creates **Adjustment** transactions for every item with a discrepancy, bringing the system quantities in line with physical reality.

> You cannot close a count until all items have a physical quantity entered.

---

### How to manage products

1. Go to **Inventory → Products** (or **Catalogue → Products** depending on your sidebar).
2. Click **New Product** to add a product.
3. Fill in:
   - **Name** and **Category** (required)
   - **SKU** is auto-generated from the category prefix and physical dimensions — you can override it
   - **Physical Specs**: Thickness, Size 1, Size 2, Length, Weight Per Piece
   - **Purchase Cost** (ETB) — the current landed cost per piece
   - **Minimum Stock Level** — triggers the low-stock alert on the dashboard
   - **Barcode** (only visible if barcode feature is enabled in System Settings)
4. Click **Save**.

---

### How to manage categories

1. Go to **Catalogue → Categories**.
2. Click **New Category**.
3. Enter:
   - **Name** (e.g., "Rectangular Hollow Section")
   - **Prefix** (e.g., "RHS") — used in SKU generation, must be unique
4. Click **Save**.

> You cannot delete a category that has products assigned to it.

---

## 6. System Settings *(Admin Only)*

Go to **Settings → System** to configure business rules and hardware integrations. All changes take effect immediately.

### Pricing Configuration

| Setting | Default | Description |
|---|---|---|
| VAT Rate | 0.15 | Tax as a decimal (0.15 = 15%) — must be between 0 and 1 |
| Retail Markup | 1.15 | Price multiplier for retail customers (1.15 = 15% above cost) |
| Wholesale Markup | 1.05 | Price multiplier for wholesale customers |
| VIP Markup | 1.05 | Price multiplier for VIP customers |
| Preferred Markup | 1.08 | Price multiplier for preferred customers |

> Markups must be **at least 1.0**. A value below 1.0 would mean selling at a loss.

---

### Currency Formatting

| Setting | Default | Description |
|---|---|---|
| Currency Code | ETB | 3-letter ISO code (e.g., ETB, USD, EUR) |
| Currency Locale | en-ET | BCP 47 locale tag for number formatting (e.g., en-ET, am-ET, en-US) |

---

### Company Information

Printed on receipts and PDF invoices.

| Setting | Default | Max length |
|---|---|---|
| Company Name | NOVA METAL PLC | 100 characters |
| Company Address | Addis Ababa, Ethiopia | 200 characters |

---

### Barcode Feature

Toggle the barcode field on/off across the product catalogue:

- **Enabled** — a Barcode field appears when creating or editing products.
- **Disabled** — the field is hidden. Existing barcodes are preserved in the database and will reappear if the feature is re-enabled.

---

### Thermal Printer

| Setting | Options | Description |
|---|---|---|
| Connection Type | Network / USB | How the printer is connected |
| Printer Address | e.g., 192.168.1.100 or 192.168.1.100:9100 | IP address or hostname (required for Network) |
| Paper Width | 58mm / 80mm | The paper roll loaded in the printer |

> When **Network** is selected, the printer address is required. The default port is 9100 if no port is specified.

---

## 7. User Management *(Admin Only)*

Go to **Settings → Users** to manage staff accounts.

### How to create a user

1. Click **Add User**.
2. Fill in:
   - **Full Name**
   - **Email** (used to log in — must be unique)
   - **Password** (minimum 8 characters)
   - **Role**: Admin, Sales, or Warehouse
3. Click **Create User**.

The user can log in immediately with the provided credentials.

---

### How to change a user's role

1. Find the user in the list.
2. Click the **Actions** dropdown button on the right side of the user's row.
3. Under **Change Role**, click **Set as admin**, **Set as sales**, or **Set as warehouse**.

> The user will be **logged out immediately** and must sign in again. Their new permissions take effect on next login.

> You cannot change your own role away from Admin.

---

### How to deactivate a user

1. Find the user in the list.
2. Click the **Actions** dropdown button on the right side of the user's row.
3. Click **Deactivate**.

A deactivated user cannot log in. All their active sessions are terminated immediately. Their historical data (orders, transactions) is preserved.

> You cannot deactivate your own account.

---

### How to update your profile

Go to **Settings → Profile** to update your display name or change your password.

---

## Appendix: Pricing Tiers

The system has two separate sets of tiers:

### Customer account tiers (registered customers)

Set on the customer's profile and used automatically when creating an order for that customer.

| Tier | UI Label | Markup |
|---|---|---|
| STANDARD | Standard (Retail) | +15% |
| PREFERRED | Preferred | +8% |
| VIP | VIP (Wholesale) | +5% |

### Walk-in order tiers (anonymous customers)

Selected manually when creating an order without a registered customer.

| Tier | Markup |
|---|---|
| RETAIL | +15% |
| WHOLESALE | +5% |
| VIP | +5% |
| PREFERRED | +8% |

### How prices are calculated

Markups are applied to the product's **average purchase cost** to produce the **unit price**. VAT is then calculated on the order subtotal — it is **not** included in the unit price.

**Unit Price** = `Purchase Cost × Markup`

**Order Total** = `Subtotal + (Subtotal × VAT Rate)`

**Example (STANDARD / Retail):** Landing cost ETB 100, qty 10
- Unit price = 100 × 1.15 = **ETB 115.00**
- Subtotal = 115.00 × 10 = **ETB 1,150.00**
- VAT (15%) = **ETB 172.50**
- **Total = ETB 1,322.50**

---

## Appendix: Payment Methods

| Method | When to use |
|---|---|
| Cash | Physical notes and coins |
| Bank Transfer | Direct bank deposit or wire |
| Telebirr | Mobile money (CBE Birr, Telebirr) |
| Cheque | Business cheques |

---

*For technical issues, contact your system administrator.*
