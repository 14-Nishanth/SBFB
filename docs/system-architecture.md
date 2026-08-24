# SBFB Digital Business Platform

## Product architecture

SBFB has two connected surfaces:

1. **Public website** — Google/SEO, products, location, enquiries and WhatsApp.
2. **Private management system** — authenticated owner/staff console for operations and company data.

## Core modules

- Material inward / purchases
- Material outward / sales
- Inventory and stock ledger
- Product and price master
- Production batches
- Material/landed cost
- Selling cost and margin
- Customers and receivables
- Suppliers and payables
- Employees, attendance and salary
- Expenses: electricity, transport, loading, repairs, fuel and other
- Quotes / enquiries from the website
- Reports: sales, purchases, stock, production, expenses and profit/loss
- Security audit log

## Security model

- Supabase Auth for authentication.
- Role-based authorization stored in `app_metadata`, never `user_metadata`.
- RLS on every exposed business table.
- No service-role key in browser code.
- Short-lived sensitive sessions and explicit logout-all-devices support.
- Audit events for successful/failed login, password changes, role changes, deletes and other sensitive operations.
- Owner alerts for successful admin login, repeated failed logins and critical security events.

## Cost model

For manufactured goods, actual unit cost should be based on landed/production cost rather than purchase price alone:

`raw materials + labour + electricity + loading/unloading + transport + other production cost ÷ good units produced`

Sales margin:

`selling revenue − actual product cost − directly attributable selling/delivery cost`

## Website → management flow

`Google Search → SBFB Website → Product/Quote → Lead → Customer → Sale → Stock movement → Payment → Reports`

## Build sequence

### Phase A — current
- Public website and local SEO
- Product catalogue
- Google Maps location
- WhatsApp quotation CTA
- Management dashboard UI prototype

### Phase B — database/auth
- Supabase project
- Auth + roles
- Core schema + RLS
- Audit events
- Owner security alerts

### Phase C — operations
- Inward/outward
- Stock
- Production
- Costs/prices
- Customers/suppliers
- Employee salary
- Expenses

### Phase D — analytics
- Profit/loss
- Product margins
- Stock valuation
- Outstanding payments
- PDF/Excel reports
- AI business assistant
