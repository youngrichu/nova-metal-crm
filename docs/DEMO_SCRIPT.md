# Nova Metal CRM — Demo & Acceptance Test Script

> **Purpose:** Step-by-step walkthrough to verify every major workflow before go-live.
> **Audience:** Developer, QA tester, or business owner performing acceptance testing.
> **Estimated time:** 60–90 minutes for a full run.
> **Prerequisite:** The application is running and the database has been migrated (`npm run db:migrate` or Docker Compose up).

---

## How to Use This Script

Work through each section in order. Each step has:
- **Action** — what to do
- **Expected result** — what you should see
- **✅ Pass / ❌ Fail** — mark as you go

If a step fails, note the behaviour you saw before continuing. Do not skip ahead — later steps depend on data created in earlier ones.

---

## Pre-flight Checklist

Before starting, confirm:

- [ ] Application is accessible at `http://localhost:3000`
- [ ] Database is empty (fresh migration) or reset to a clean state
- [ ] No other users are logged in during the test

---

## Section 1 — First Login & Admin Setup

### 1.1 Log in as Admin

| | |
|---|---|
| **Action** | Navigate to `http://localhost:3000`. You should be redirected to `/login`. Enter the admin credentials that were seeded during setup. |
| **Expected** | Redirected to the Dashboard. Sidebar shows all menu items (Dashboard, Products, Categories, Inventory, Sales, Customers, Settings). |

---

### 1.2 Configure System Settings

| | |
|---|---|
| **Action** | Go to **Settings → System**. Set the following values and click **Save Settings**: VAT Rate `0.15`, Retail Markup `1.15`, Wholesale Markup `1.05`, Currency Code `ETB`, Currency Locale `en-ET`, Company Name `NOVA METAL PLC`, Company Address `Addis Ababa, Ethiopia`. |
| **Expected** | A success toast notification appears. Reloading the page shows the saved values. |

---

### 1.3 Verify invalid settings are rejected

| | |
|---|---|
| **Action** | In System Settings, set VAT Rate to `1.5` and click Save. |
| **Expected** | An error message appears: *"VAT rate must be between 0 and 1"*. Settings are not saved. |

| | |
|---|---|
| **Action** | Set Retail Markup to `0.9` and click Save. |
| **Expected** | Error: *"markup_retail must be at least 1.0"*. |

| | |
|---|---|
| **Action** | Set Currency Code to `etb` (lowercase) and click Save. |
| **Expected** | Error: *"Currency code must be a 3-letter uppercase ISO code"*. |

Reset all values to their correct defaults before proceeding.

---

### 1.4 Create a Sales user

| | |
|---|---|
| **Action** | Go to **Settings → Users**. Click **Add User**. Enter Name: `Sara Tesfaye`, Email: `sara@nova.et`, Password: `Password123`, Role: `Sales`. Click **Create User**. |
| **Expected** | Sara appears in the user list with role "Sales" and status Active. |

---

### 1.5 Create a Warehouse user

| | |
|---|---|
| **Action** | Click **Add User** again. Enter Name: `Dawit Bekele`, Email: `dawit@nova.et`, Password: `Password123`, Role: `Warehouse`. Click **Create User**. |
| **Expected** | Dawit appears in the user list with role "Warehouse". |

---

### 1.6 Verify role-based sidebar (Sales user)

| | |
|---|---|
| **Action** | Open a private/incognito browser window. Log in as `sara@nova.et`. |
| **Expected** | Sidebar shows: Dashboard, Sales, Customers, Settings. **Does not show** Products, Categories, Inventory, or Warehouses. |

---

### 1.7 Verify role-based sidebar (Warehouse user)

| | |
|---|---|
| **Action** | Open another private window. Log in as `dawit@nova.et`. |
| **Expected** | Sidebar shows: Dashboard, Products, Categories, Inventory, Settings. **Does not show** Sales, Customers, or Reconciliation. Dashboard shows inventory counts and alerts but **not** Total Revenue or Total Profit. |

Keep all three windows open (admin, Sara, Dawit) for subsequent sections.

---

## Section 2 — Catalogue Setup

*Perform as Admin.*

### 2.1 Create a Category

| | |
|---|---|
| **Action** | Go to **Catalogue → Categories**. Click **New Category**. Enter Name: `Rectangular Hollow Section`, Prefix: `RHS`. Click **Save**. |
| **Expected** | Category appears in the list with prefix RHS. |

---

### 2.2 Create a second Category

| | |
|---|---|
| **Action** | Create another: Name: `Square Hollow Section`, Prefix: `SHS`. |
| **Expected** | Both categories appear in the list. |

---

### 2.3 Verify duplicate prefix is rejected

| | |
|---|---|
| **Action** | Try to create a third category with Prefix: `RHS`. |
| **Expected** | Error indicating the prefix is already in use. |

---

### 2.4 Create a Product

| | |
|---|---|
| **Action** | Go to **Catalogue → Products**. Click **New Product**. Fill in: Name: `RHS 20x30x1.5 L6000`, Category: `Rectangular Hollow Section`, Thickness: `1.5`, Size 1: `20`, Size 2: `30`, Length: `6000`, Weight Per Piece: `4.2`, Purchase Cost: `450`, Minimum Stock Level: `10`. Click **Save**. |
| **Expected** | Product is created. SKU is auto-generated (e.g., `RHS20x30x1.5x6000`). Product appears in the list. |

---

### 2.5 Create a second Product

| | |
|---|---|
| **Action** | Create: Name: `SHS 40x40x2 L6000`, Category: `Square Hollow Section`, Thickness: `2`, Size 1: `40`, Size 2: `40`, Length: `6000`, Weight Per Piece: `7.1`, Purchase Cost: `820`, Minimum Stock Level: `5`. |
| **Expected** | Second product created with SKU `SHS40x40x2x6000`. |

---

## Section 3 — Inventory Setup

*Perform as Dawit (Warehouse user) or Admin.*

### 3.1 Create a Warehouse

| | |
|---|---|
| **Action** | Go to **Inventory → Warehouses**. Click **New Warehouse**. Enter Name: `Main Store`, Location: `Addis Ababa – Bole Industrial Zone`. Click **Save**. |
| **Expected** | Warehouse appears in the list. |

---

### 3.2 Stock In — Product 1

| | |
|---|---|
| **Action** | Go to **Inventory**. Click **Record Transaction**. Select Type: `Stock In`, Product: `RHS 20x30x1.5 L6000`, Warehouse: `Main Store`, Quantity: `50`, Unit Cost: `450`, Reference: `GRN-001`. Click **Save**. |
| **Expected** | Transaction recorded. The product now shows 50 units in Main Store. The System Telemetry feed on the Dashboard shows a `↑` entry for this product. |

---

### 3.3 Stock In — Product 2

| | |
|---|---|
| **Action** | Record: Type: `Stock In`, Product: `SHS 40x40x2 L6000`, Warehouse: `Main Store`, Quantity: `30`, Unit Cost: `820`, Reference: `GRN-001`. |
| **Expected** | 30 units recorded for the SHS product. |

---

### 3.4 Verify low-stock alert does NOT appear

| | |
|---|---|
| **Action** | Go to the Dashboard. Check the **Critical Deficits** panel. |
| **Expected** | Panel shows "Grid Operational" — no items are below minimum stock level (50 ≥ 10, 30 ≥ 5). |

---

### 3.5 Verify Stock Out rejection

| | |
|---|---|
| **Action** | Record: Type: `Stock Out`, Product: `RHS 20x30x1.5 L6000`, Warehouse: `Main Store`, Quantity: `999`. |
| **Expected** | Error: insufficient quantity. Transaction is not saved. |

---

## Section 4 — Customer Management

*Perform as Sara (Sales user).*

### 4.1 Create a Customer

| | |
|---|---|
| **Action** | Go to **Customers**. Click **New Customer**. Enter Name: `Haile Construction`, Company Name: `Haile Construction PLC`, Phone: `0911 223344`, Customer Type: `Workshop`, Pricing Tier: `Wholesale`, TIN: `0012345678`. Click **Save**. |
| **Expected** | Customer profile created and visible in the list. |

---

### 4.2 Search for the Customer

| | |
|---|---|
| **Action** | On the Customers page, type `haile` in the search box. |
| **Expected** | Haile Construction appears in results. |

| | |
|---|---|
| **Action** | Search for `0011` (partial TIN — not matching). |
| **Expected** | No results (or does not match Haile's TIN `0012345678`). |

---

### 4.3 Verify duplicate TIN is rejected

| | |
|---|---|
| **Action** | Try to create a second customer with TIN `0012345678`. |
| **Expected** | Error indicating the TIN is already in use. |

---

## Section 5 — Full Sales Cycle

*Perform as Sara (Sales user).*

### 5.1 Create a Sales Order

| | |
|---|---|
| **Action** | Go to **Sales → Orders**. Click **New Order**. Select Customer: `Haile Construction`. Add item: Product `RHS 20x30x1.5 L6000`, Quantity `10`. Note the auto-calculated unit price. Add a second item: Product `SHS 40x40x2 L6000`, Quantity `5`. Click **Create Order**. |
| **Expected** | Order created in **DRAFT** status with an order number (e.g., SO-2026-0001). Subtotal, VAT (15%), and Total are displayed correctly. Unit price for RHS = ETB 450 × 1.05 × 1.15 = ETB 542.81 (Wholesale markup + VAT). |

> **Spot-check the maths:**
> RHS: 450 × 1.05 = 472.50 × 1.15 = **ETB 543.38** × 10 pcs = **ETB 5,433.75**
> SHS: 820 × 1.05 = 861.00 × 1.15 = **ETB 990.15** × 5 pcs = **ETB 4,950.75**
> Subtotal (pre-tax): divide total by 1.15 to check VAT extraction

---

### 5.2 Convert to Quote

| | |
|---|---|
| **Action** | On the order detail page, click **Convert to Quote** in the Workflow Actions panel. |
| **Expected** | Status badge changes to **QUOTE**. The "Convert to Quote" button disappears; "Confirm Order" and "Cancel Order" remain. |

---

### 5.3 Confirm the Order

| | |
|---|---|
| **Action** | Click **Confirm Order**. |
| **Expected** | Status changes to **CONFIRMED**. "Record Payment" button appears. Active Orders count on the Dashboard increments by 1. |

---

### 5.4 Record a Partial Payment

| | |
|---|---|
| **Action** | Click **Record Payment**. Enter Amount: `5000`, Method: `Cash`. Click **Save Payment**. |
| **Expected** | Payment appears in the payment history. **Total Paid** shows ETB 5,000. **Balance Due** shows the remaining amount. |

---

### 5.5 Record a Second Payment (Bank Transfer)

| | |
|---|---|
| **Action** | Click **Record Payment** again. Enter the remaining balance, Method: `Bank Transfer`, Reference: `TXN-20260315-001`. Click **Save Payment**. |
| **Expected** | Balance Due shows ETB 0.00 (or near zero). Both payments listed in history. |

---

### 5.6 Generate Invoice

| | |
|---|---|
| **Action** | Click **Generate Invoice** in the Workflow Actions panel. |
| **Expected** | Status changes to **INVOICED**. Workflow action buttons are removed (terminal state). |

---

### 5.7 Download PDF Invoice

| | |
|---|---|
| **Action** | Click **PDF Invoice** in the page header. |
| **Expected** | A PDF opens in a new tab titled "INVOICE" (not "QUOTATION") containing: NOVA METAL PLC header, Haile Construction billing info, order number, both line items with correct quantities and prices, VAT breakdown, and total amount. |

---

### 5.8 Create a Walk-In Order

| | |
|---|---|
| **Action** | Click **New Order**. Leave the Customer dropdown empty. Enter Walk-In Phone: `0922 334455`, Pricing Tier: `Retail`. Add item: `RHS 20x30x1.5 L6000`, Quantity `2`. Click **Create Order**. |
| **Expected** | Order created in DRAFT. Unit price reflects **Retail** markup (1.15×) rather than Wholesale — should be higher than the previous order. |

---

### 5.9 Link Walk-In Order to a Customer

| | |
|---|---|
| **Action** | Go to **Customers → New Customer**. Create: Name: `Tigist Alemu`, Phone: `0922 334455`, Pricing Tier: `Retail`. Click **Save**. |
| **Expected** | After saving, a prompt appears asking whether to link unlinked walk-in orders with this phone number. Select the walk-in order and confirm. |

| | |
|---|---|
| **Action** | Open the walk-in order from Sales. |
| **Expected** | The order now shows **Tigist Alemu** as the customer. The unit prices are unchanged. |

---

## Section 6 — Dashboard Filters

*Perform as Admin.*

### 6.1 Verify filters affect KPIs

| | |
|---|---|
| **Action** | Go to the Dashboard. Note the Total Revenue displayed with the default filter (This Month). |
| **Expected** | Revenue reflects the invoiced order created in Section 5. |

| | |
|---|---|
| **Action** | Change the date range to **Last 7 Days**. |
| **Expected** | URL updates to `?range=last-7-days&period=day`. Revenue stays the same (order was just created). |

| | |
|---|---|
| **Action** | Change the date range to **Last Quarter** (the previous quarter). |
| **Expected** | Revenue shows ETB 0 (no orders exist in the previous quarter). The chart is empty. |

| | |
|---|---|
| **Action** | Switch back to **This Month**. |
| **Expected** | Revenue returns to the value from the invoiced order. |

---

### 6.2 Verify period toggle changes chart grouping

| | |
|---|---|
| **Action** | With **This Month** selected, click the **Week** toggle. |
| **Expected** | Chart subtitle changes to "Weekly revenue — This Month". URL updates to `?period=week`. The chart redraws with weekly data points. |

| | |
|---|---|
| **Action** | Click the **Month** toggle. |
| **Expected** | Subtitle shows "Monthly revenue". Chart shows a single data point for this month. |

---

### 6.3 Verify filter persists on refresh

| | |
|---|---|
| **Action** | While on **This Year / Day**, reload the page (Ctrl+R / Cmd+R). |
| **Expected** | The filter state is preserved — "Day" is still active, "This Year" is still selected in the dropdown. Data matches. |

---

## Section 7 — Inventory Stock Take

*Perform as Dawit (Warehouse user).*

### 7.1 Start a stock take

| | |
|---|---|
| **Action** | Go to **Inventory → Stock Takes**. Click **Start New Count**. Select Warehouse: `Main Store`. Click **Start**. |
| **Expected** | A new count session opens showing all products in Main Store with their expected quantities (RHS: 50, SHS: 30). |

---

### 7.2 Enter physical counts with a discrepancy

| | |
|---|---|
| **Action** | For `RHS 20x30x1.5 L6000`, enter Physical Quantity: `48` and Note: `2 units damaged`. Click **Save**. |
| **Expected** | Item is saved. |

| | |
|---|---|
| **Action** | For `SHS 40x40x2 L6000`, enter Physical Quantity: `30`. Click **Save**. |
| **Expected** | Both items now have physical quantities entered. |

---

### 7.3 Review and close the count

| | |
|---|---|
| **Action** | Click **Review & Close**. |
| **Expected** | Summary shows: 1 item with discrepancy (RHS, delta: −2), 1 item balanced (SHS, delta: 0). |

| | |
|---|---|
| **Action** | Click **Close Count**. |
| **Expected** | Count status changes to CLOSED. RHS inventory in Main Store is now 48. The System Telemetry feed on the Dashboard shows a `±` ADJUSTMENT entry for the RHS product. |

---

### 7.4 Verify low-stock alert appears

| | |
|---|---|
| **Action** | Go to the Dashboard. |
| **Expected** | RHS 20x30x1.5 L6000 still has 48 units vs. minimum 10 — **no alert**. The Critical Deficits panel still shows "Grid Operational". |

| | |
|---|---|
| **Action** | As Admin, record a **Stock Out** of 42 units for the RHS product (bringing stock to 6, below the minimum of 10). |
| **Expected** | Dashboard Critical Deficits panel now lists `RHS20x30x1.5x6000` with `6 / 10`. The Inventory Alerts KPI counter shows `1`. |

---

## Section 8 — Daily Reconciliation

*Perform as Sara (Sales user).*

### 8.1 Run end-of-day reconciliation

| | |
|---|---|
| **Action** | Go to **Sales → Reconciliation**. |
| **Expected** | Expected Cash shows the sum of all payments recorded today (ETB 5,000 cash from Section 5.4, plus the bank transfer from 5.5 — expected cash should only count Cash payments if your system separates methods, or all payments if not). Verify the amount matches what you recorded. |

| | |
|---|---|
| **Action** | Enter Actual Cash: same as Expected Cash. Click **Save Reconciliation**. |
| **Expected** | Discrepancy shows ETB 0.00. Reconciliation is saved and appears in the history. |

---

### 8.2 Verify duplicate reconciliation is rejected

| | |
|---|---|
| **Action** | Try to save a second reconciliation for today. |
| **Expected** | Error: a reconciliation already exists for today. |

---

## Section 9 — User Management Edge Cases

*Perform as Admin.*

### 9.1 Verify admin cannot self-demote

| | |
|---|---|
| **Action** | Go to **Settings → Users**. Find your own admin account. Try to change your role to "Sales". |
| **Expected** | Error: cannot change your own role. |

---

### 9.2 Verify admin cannot deactivate themselves

| | |
|---|---|
| **Action** | Try to toggle your own account to Inactive. |
| **Expected** | Error: cannot deactivate your own account. |

---

### 9.3 Deactivate a user and verify they cannot log in

| | |
|---|---|
| **Action** | Deactivate Sara's account (toggle to Inactive). |
| **Expected** | Sara's status changes to Inactive. |

| | |
|---|---|
| **Action** | In Sara's browser window, try to navigate to any page. |
| **Expected** | Sara is redirected to `/login`. Attempting to log in with Sara's credentials fails or shows an unauthorized error. |

| | |
|---|---|
| **Action** | Re-activate Sara's account. |
| **Expected** | Sara can log in again. |

---

## Section 10 — Print Receipt (if printer is available)

*Skip this section if no thermal printer is connected. Perform as Admin or Sales.*

### 10.1 Configure the printer

| | |
|---|---|
| **Action** | Go to **Settings → System**. Set Printer Type to `Network`, Printer Address to your printer's IP (e.g., `192.168.1.100`), Paper Width to `80mm`. Click **Save Settings**. |
| **Expected** | Settings saved successfully. |

---

### 10.2 Print a receipt

| | |
|---|---|
| **Action** | Open the INVOICED order from Section 5.6. Click **Print Receipt**. |
| **Expected** | A success toast: *"Receipt sent to printer"*. The thermal printer outputs a receipt containing: NOVA METAL PLC header, order number, date, both line items, VAT breakdown, total, and "Thank you for your business!". |

---

### 10.3 Verify error message on unreachable printer

| | |
|---|---|
| **Action** | In System Settings, change the Printer Address to an address that does not exist on the network (e.g., `192.168.99.99`). Click **Print Receipt** on any order. |
| **Expected** | An error toast describes the failure (e.g., "ECONNREFUSED" or "Print timed out after 15 seconds") — not a generic "something went wrong" message. |

---

## Final Checklist

Before signing off, confirm all sections passed:

- [ ] Section 1 — Login, settings configuration, user creation
- [ ] Section 2 — Categories and products created
- [ ] Section 3 — Warehouses and stock-in recorded
- [ ] Section 4 — Customer created and searchable
- [ ] Section 5 — Full order cycle: DRAFT → QUOTE → CONFIRMED → INVOICED
- [ ] Section 5 — Payments recorded, PDF invoice downloaded
- [ ] Section 5 — Walk-in order created and linked to customer
- [ ] Section 6 — Dashboard filters affect KPIs and chart correctly
- [ ] Section 7 — Stock take performed and adjustments applied
- [ ] Section 7 — Low-stock alert triggered and visible on dashboard
- [ ] Section 8 — Daily reconciliation saved; duplicate rejected
- [ ] Section 9 — Role restrictions and self-protection rules enforced
- [ ] Section 10 — Receipt printed (if hardware available)

---

*If all items are checked, the system is verified and ready for production use.*
