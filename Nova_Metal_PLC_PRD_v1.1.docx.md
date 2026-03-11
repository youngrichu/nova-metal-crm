

![][image1]

**Product Requirements Document**

**CRM & Inventory Management System**

Version 1.0  |  March 2026  
Addis Ababa, Ethiopia

*Confidential*

# **Document Information**

| Document Title | Nova Metal PLC \- CRM & Inventory Management System PRD |
| :---- | :---- |
| **Version** | 1.0 |
| **Date** | March 9, 2026 |
| **Status** | Draft |
| **Author** | \[Product Owner\] |
| **Company** | Nova Metal PLC, Addis Ababa, Ethiopia |
| **Stakeholders** | Nova Metal Operations, Sales Team, Management |

## **Revision History**

| Version | Date | Author | Changes |
| :---- | :---- | :---- | :---- |
| 1.0 | March 9, 2026 | \[Product Owner\] | Initial draft |

# **1\. Executive Summary**

Nova Metal PLC is a metal building materials vendor based in Addis Ababa, Ethiopia, specializing in Rectangular Hollow Sections (RHS), Circular Hollow Sections (CHS), Lamera (sheet metal), Piyato (flat iron bars), Tondino (heavy rebar), angle bars, flat bars, and related steel profiles. The company serves fabrication workshops and individual walk-in buyers through walk-in/on-site sales and phone/WhatsApp order channels. All sales are cash-based with no customer credit.

This PRD defines the requirements for a combined CRM and Inventory Management System designed to replace manual tracking processes, provide real-time inventory visibility, and improve customer relationship management. The system will be deployed on-premise at the store location (which does not have internet access), running entirely on a local server and network. It will streamline daily operations from stock receiving through sales fulfillment, while building a foundation for data-driven business decisions.

# **2\. Problem Statement**

## **2.1 Current Pain Points**

1. **Inventory Blind Spots:** No real-time view of stock levels across product types and dimensions. Staff must physically check racks to confirm availability, leading to delays and errors.

2. **Customer Data Loss:** No centralized record of customer contacts or purchase history. Repeat customers must re-explain their needs, and past transactions are difficult to look up.

3. **Manual Sales Process:** Quotes, orders, and receipts are handled on paper or via informal messaging. This creates inconsistency, slows response times, and makes order tracking difficult.

4. **No Business Intelligence:** Management lacks visibility into sales trends, profit margins by product, seasonal demand patterns, and inventory turnover rates.

## **2.2 Business Impact**

* Lost sales due to inability to confirm stock availability quickly

* Overstock of slow-moving items, understock of popular dimensions

* No record of past transactions per customer, making repeat business slower

* Inability to forecast demand or optimize purchasing

# **3\. Goals & Success Metrics**

| Goal | Success Metric | Target |
| :---- | :---- | :---- |
| Real-time inventory accuracy | Stock count variance (system vs. physical) | \< 2% variance within 6 months |
| Faster customer service | Average time to generate a quote | Under 2 minutes (from 10+ min) |
| Cash transaction accuracy | Payment recording discrepancies per week | Zero unrecorded sales within 3 months |
| Reduced stockouts | Stockout incidents per month | 50% reduction in 3 months |
| Data-driven purchasing | Inventory turnover ratio improvement | 20% improvement in 12 months |

# **4\. User Personas**

## **4.1 Warehouse Manager (Yabu)**

**Role:** Manages stock receiving, placement on racks, and physical inventory counts.

**Goals:** Know exactly what is in stock, where it is, and when to reorder. Needs a fast way to log incoming shipments and adjustments.

**Frustrations:** Currently relies on memory and paper logs. Cannot quickly answer "Do we have 50x50 RHS 2mm in stock?" without physically checking the racks.

## **4.2 Sales Counter Staff (Arsema)**

**Role:** Serves walk-in customers and handles phone/WhatsApp orders.

**Goals:** Quickly look up prices and availability, generate quotes, and process cash sales.

**Frustrations:** Has to check with the warehouse for availability and manually calculate prices. No quick way to look up a returning customer's past orders.

## **4.3 Business Owner (Netsi)**

**Role:** Oversees operations, purchasing, and business strategy.

**Goals:** Dashboard visibility into sales performance, inventory value, and profit margins. Wants alerts for low stock and reorder suggestions.

**Frustrations:** No data for making purchasing decisions. Cannot tell which products generate the best margins or which customers represent the highest value.

# **5\. Product Scope**

## **5.1 In Scope (MVP / Phase 1\)**

* Inventory Management Module (real-time stock tracking, stock-in/stock-out, alerts)

* Product Catalog with structured SKU system for metal profiles

* Customer Management Module (contacts, purchase history)

* Sales & Invoicing Module (quotes, orders, receipts, payment tracking)

* Basic Reporting Dashboard

* User roles and permissions

* On-premise deployment (local server, no internet dependency)

## **5.2 Out of Scope (Future Phases)**

* E-commerce / online storefront

* Integration with accounting software (e.g., Peachtree, QuickBooks)

* Delivery management and logistics tracking

* Multi-warehouse support

* WhatsApp Business API integration for automated order intake

* Barcode/QR code scanning for stock management

* Cloud migration and remote access

# **6\. Functional Requirements**

## **6.1 Product Catalog & SKU Structure**

The system must support a hierarchical product classification that reflects how metal building materials are organized in the physical warehouse.

**SKU Structure:** \[Category\]-\[Profile\]-\[Dimensions\]-\[Thickness\]-\[Length\]-\[Finish\]

**Example:** RHS-5050-2.0-6000-BLK (RHS 50x50mm, 2mm thick, 6m length, black finish)

| Category | Product Types | Key Attributes |
| :---- | :---- | :---- |
| **RHS** | Rectangular Hollow Sections | Width x Height, Thickness, Length |
| **CHS** | Circular Hollow Sections | Outer Diameter, Thickness, Length |
| **Lamera** | Sheet Metal / Plates | Width x Length, Thickness, Gauge |
| **ANG** | Angle Bars | Side A x Side B, Thickness, Length |
| **FLT** | Flat Bars | Width, Thickness, Length |
| **RND** | Round Bars / Pipes | Diameter, Thickness (if hollow), Length |
| **PYT** | Piyato (Flat Iron Bars) | Width, Thickness, Length |
| **TND** | Tondino (Heavy Rebar) | Diameter, Length, Grade |

**Requirements:**

* Each product must have a unique auto-generated SKU based on its attributes

* Support for custom/non-standard dimensions with manual SKU override

* Pricing fields: cost price, selling price (per piece, per meter, per kg), and customer-tier pricing

* Pricing in Ethiopian Birr (ETB) as the default currency

* Minimum stock threshold per product for reorder alerts

* Product images (optional, for quick visual identification)

## **6.2 Inventory Management**

This is the highest priority module. It must provide real-time, accurate stock visibility at all times.

**6.2.1 Stock-In (Receiving)**

1. Log incoming shipments with supplier info, purchase order reference, and date received

2. Record quantities per product (by piece count or by weight, depending on product type)

3. Automatic stock level update upon confirmation

4. Cost price capture for margin calculation

**6.2.2 Stock-Out (Sales Deduction)**

1. Automatic stock deduction upon confirmed sale

2. Manual adjustment capability for damages, returns, or corrections

3. Adjustment reason tracking with user attribution and timestamp

**6.2.3 Stock Visibility & Alerts**

* Real-time stock levels displayed per product, filterable by category, dimensions, and thickness

* Low stock alerts triggered when quantity falls below configurable minimum threshold

* Out-of-stock visual indicators on the product catalog view

* Stock movement history (full audit trail of all in/out transactions)

**6.2.4 Physical Inventory Count**

* Periodic stock-take workflow: initiate count, enter physical counts, and reconcile discrepancies

* Variance report comparing system count vs. physical count

* Ability to adjust system stock to match physical count with approval workflow

## **6.3 Customer Management (CRM)**

**6.3.1 Customer Profiles**

* Customer name, phone number(s), WhatsApp number, email (optional), and company/workshop name

* Customer type classification: Fabrication Workshop or Individual Buyer

* TIN (Tax Identification Number) field for business customers (required for VAT invoices in Ethiopia)

* Notes field for special preferences, pricing agreements, or delivery instructions

* Automatic capture of new customers during first sale

**6.3.2 Purchase History**

* Complete order history per customer with date, items, quantities, and amounts

* Quick-reorder functionality based on past purchases (for repeat fabrication workshop orders)

* Search and filter by date range, product type, or order value

**6.3.3 Payment Recording (Cash Only)**

Nova Metal PLC operates on a cash-only basis with no customer credit. The system must support:

1. Payment recording for each sale (cash, bank transfer, mobile money/Telebirr)

2. Daily cash reconciliation: total system sales vs. physical cash count

3. Receipt generation for every completed transaction

4. Transaction history per customer showing all past purchases and payments

## **6.4 Sales & Invoicing**

**6.4.1 Quotation Workflow**

1. Create quotes by selecting products, quantities, and applicable pricing tier

2. Support for per-piece, per-meter, and per-kg pricing with automatic total calculation

3. Quote validity period (configurable, default 7 days)

4. One-click conversion of quote to confirmed order

5. Print quote or export as PDF (for WhatsApp sharing when staff has personal internet)

**6.4.2 Order Processing**

* Order status tracking: Draft, Confirmed, Ready for Pickup, Completed, Cancelled

* Automatic stock reservation upon order confirmation

* Stock deduction upon order completion (handover to customer)

* Support for partial fulfillment (e.g., partial delivery of a large order)

**6.4.3 Invoicing & Payments**

* Auto-generated invoices from confirmed orders with unique invoice numbers

* Payment methods: Cash, Bank Transfer, Mobile Money (Telebirr/CBE Birr)

* Full payment required at time of sale (no credit terms)

* Receipt generation (printable via local/thermal printer)

* VAT calculation support (15% standard Ethiopian VAT rate, configurable)

* 3% withholding tax handling on purchases from vendors (automatically calculated and recorded)

## **6.5 Pricing Engine**

Metal pricing is dynamic and requires flexibility. The system must support:

* Base price per product in ETB (updatable as market rates change)

* Customer tier pricing: Standard (walk-in), Preferred (regular workshops), VIP (high-volume buyers)

* Bulk discount rules (e.g., 5% off for orders over 50 pieces of same SKU)

* Manual price override by authorized users (with audit trail)

* Price history log to track rate changes over time

## **6.6 Reporting & Analytics**

**6.6.1 Inventory Reports**

* Current stock levels by category, profile, and dimension

* Stock valuation report (quantity x cost price) in ETB

* Slow-moving and dead stock identification

* Stock-in vs. stock-out trends over time

**6.6.2 Sales Reports**

* Daily, weekly, and monthly sales summaries

* Revenue and margin analysis by product category

* Top-selling products and top customers

* Sales by channel (walk-in vs. phone/WhatsApp)

**6.6.3 Payment Reports**

* Daily cash reconciliation report (total sales vs. cash collected)

* Payment method breakdown (cash vs. bank transfer vs. mobile money)

* Per-customer transaction history and total spending

**6.6.4 Dashboard**

* Real-time KPI tiles: total stock value, today's sales, daily cash collected, low-stock item count

* Charts: sales trend (30 days), top 5 products, payment method breakdown

* Quick-action buttons: New Sale, New Stock-In, View Alerts

# **7\. Non-Functional Requirements**

| Requirement | Detail |
| :---- | :---- |
| **Performance** | Page load under 2 seconds on local network. Stock lookups under 500ms. Support up to 10 concurrent users on LAN without degradation. |
| **Availability** | System must be available during business hours (7 AM to 9 PM EAT). Automated local backups daily with 30-day retention on a separate drive or NAS. |
| **Security** | Role-based access control (RBAC). Password-protected login. Data encryption at rest. All stock and financial transactions must have a full audit trail. |
| **Usability** | Mobile-responsive design (staff may use tablets in the warehouse). Amharic and English language support. Minimal training required; target 1-day onboarding per user. |
| **Deployment** | Fully on-premise: local server (Linux or Windows), local network (LAN/WiFi). No internet dependency for core operations. Periodic manual backup to external drive recommended. |
| **Scalability** | Handle up to 5,000 SKUs and 2,000 customer records in Phase 1\. Architecture should support multi-warehouse expansion in future phases. |
| **Data Integrity** | All stock movements must be atomic (no partial updates). Transaction rollback on failure. Referential integrity across orders, invoices, and inventory. |

# **8\. User Roles & Permissions**

| Role | Inventory | Sales / CRM | Reports / Settings |
| :---- | :---- | :---- | :---- |
| **Owner / Admin** | Full access (CRUD \+ adjustments \+ approvals) | Full access (all sales, customer, and pricing operations) | Full access (all reports \+ system config) |
| **Sales Staff** | View stock levels only | Create quotes, orders, invoices. Record payments. | View own sales reports only |
| **Warehouse Staff** | Stock-in, stock-out, adjustments, physical counts | View-only (order details for fulfillment) | View inventory reports only |

# **9\. Technical Considerations**

## **9.1 On-Premise Deployment**

The store does not have internet access, so the system must run entirely on local infrastructure. All features must function without any cloud dependency.

**Infrastructure Requirements:**

* Dedicated local server (minimum: 8GB RAM, 256GB SSD, Intel i5 or equivalent)

* Local Area Network (LAN) with WiFi access point for tablet/mobile access in the warehouse

* UPS (Uninterruptible Power Supply) to protect against power outages during transactions

* External hard drive or NAS for daily automated backups

* Local thermal receipt printer for invoices and receipts

**On-Premise Considerations:**

* No dependency on external APIs, CDNs, or cloud services for core functionality

* All fonts, assets, and dependencies must be bundled locally

* Software updates delivered via USB or portable drive

* Remote support possible only when store temporarily connects to internet (e.g., mobile hotspot)

## **9.2 Architecture**

* Frontend: React or similar SPA framework, served from local server ( Svelte)

* Backend: Node.js (Express) or Python (FastAPI/Django) running locally

* Database: PostgreSQL or SQLite for relational data integrity (products, orders, customers, transactions)

* All components containerized via Docker for easy deployment and maintenance on the local server

* File Storage: Local filesystem for invoices, receipts, and product images

## **9.3 Integration Points (Future)**

* WhatsApp Business API for quote/receipt sharing (requires internet; future phase)

* Accounting software (Peachtree, QuickBooks) export for financial reconciliation

* SMS gateway for payment reminders (requires periodic internet connectivity)

* Cloud sync/backup when internet is available (future phase)

# **10\. Phased Rollout Plan**

| Phase | Timeline | Deliverables | Success Criteria |
| :---- | :---- | :---- | :---- |
| **Phase 1 (MVP)** | Months 1-3 | On-premise server setup, product catalog, inventory tracking, basic stock-in/out, user auth | Staff can look up and update stock in real-time on the local network |
| **Phase 2** | Months 4-5 | Customer management, sales/invoicing workflow, payment recording | End-to-end sale recorded digitally with customer history |
| **Phase 3** | Months 6-7 | Reporting dashboard, pricing engine, alerts, receipt printing | Owner has daily visibility into KPIs and stock alerts |
| **Phase 4** | Months 8+ | Barcode scanning, backup automation, optional cloud sync prep | Faster warehouse operations and reliable data backup |

# **11\. Risks & Mitigations**

| Risk | Likelihood | Impact | Mitigation |
| :---- | :---- | :---- | :---- |
| Staff resistance to digital tools | High | High | Simple UI, 1-day training, Amharic language support, run parallel with paper for 2 weeks |
| Inaccurate initial data migration | Medium | High | Full physical count before go-live; data validation scripts |
| Power outages (common in Addis Ababa) | High | High | UPS for server and workstations; auto-save on every transaction; graceful recovery on restart |
| Local server hardware failure | Low | Critical | Daily automated backups to external drive; keep spare drive on-site; documented recovery procedure |
| Price data entry errors | Medium | High | Price change approval workflow; confirmation prompts for large deviations |
| Scope creep during development | High | Medium | Strict MVP scope; backlog for future features; regular sprint reviews |

# **12\. Appendix**

## **12.1 Glossary**

| Term | Definition |
| :---- | :---- |
| **RHS** | Rectangular Hollow Section: a steel tube with a rectangular cross-section |
| **CHS** | Circular Hollow Section: a steel tube with a circular cross-section |
| **Lamera** | Sheet metal or steel plate, typically sold by gauge/thickness and area |
| **SKU** | Stock Keeping Unit: a unique identifier for each distinct product variant |
| **ETB** | Ethiopian Birr, the official currency of Ethiopia |
| **TIN** | Tax Identification Number, required for VAT-registered businesses in Ethiopia |
| **Credit Limit** | Not applicable; Nova Metal PLC operates on a cash-only basis |
| **Piyato** | A flat iron bar, long and ruler-shaped, used in construction and fabrication |
| **Tondino** | A heavy-gauge rebar (reinforcement bar), thicker than standard rebar, used in structural reinforcement |
| **Withholding Tax** | A 3% tax withheld by Nova Metal PLC when purchasing from vendors, as required by Ethiopian tax law |
| **Telebirr** | Mobile money service by Ethio Telecom, widely used for digital payments in Ethiopia |

[image1]: <data:image/png;base64,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>