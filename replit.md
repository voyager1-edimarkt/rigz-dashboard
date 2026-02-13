# MySQL Explorer - Database Manager

## Overview
A web-based MySQL database manager that connects to a remote MySQL server through an SSH tunnel. Users can browse databases, explore table structures, view data with pagination, and run custom SQL queries.

## Architecture
- **Frontend**: React + Vite with shadcn/ui components, TanStack Query for data fetching
- **Backend**: Express.js with storage layer pattern (IStorage interface + MySQLStorage implementation)
- **Database**: SSH tunnel (ssh2) to remote server (54.161.236.27) → MySQL (mysql2) on localhost:3306
- **Pattern**: Routes → Storage Interface → MySQL Implementation → SSH Tunnel → Remote DB

## Key Files
- `server/storage.ts` - IStorage interface defining all data access methods
- `server/mysql-storage.ts` - MySQLStorage class implementing IStorage with all database queries
- `server/mysql.ts` - SSH tunnel + MySQL connection management (low-level)
- `server/routes.ts` - Thin API route handlers delegating to storage layer
- `shared/schema.ts` - TypeScript types, Zod schemas, and data interfaces
- `client/src/App.tsx` - Main app with sidebar layout
- `client/src/components/app-sidebar.tsx` - Database/table browser sidebar
- `client/src/pages/table-view.tsx` - Table structure + data viewer with pagination
- `client/src/pages/query-runner.tsx` - SQL query runner
- `client/src/pages/customers.tsx` - Customer management with stats, search, filters, detail sheet
- `client/src/pages/orders.tsx` - Orders management with stats, search, status filter, detail sheet with parsed JSON content
- `client/src/pages/products.tsx` - Products management with stats, search, vendor/location/status filters, detail sheet
- `client/src/pages/purchase-orders.tsx` - Purchase orders management with stats, search, vendor/status filters, detail page with multi-tab interface (Overview, PO Details, Line Items, Invoices, Activity Log)
- `client/src/pages/suppliers.tsx` - Suppliers management with stats cards, search, table, detail sheet
- `client/src/pages/vendors.tsx` - Vendors management with stats, search, status/state filters, table, detail sheet with address/contact sections
- `client/src/pages/warehouses.tsx` - Warehouses management with card-based grid layout, detail sheet
- `client/src/pages/errors.tsx` - Errors management with stats cards, search, type/channel filters, table, detail sheet with copyable JSON/EDI content
- `client/src/pages/dashboard.tsx` - Dashboard with US/Canada maps showing customer distribution
- `client/src/pages/inventory.tsx` - Inventory management with stats, warehouse chart, search/filters, detail sheet
- `client/src/components/connection-badge.tsx` - Connection status indicator
- `shared/schema.ts` - TypeScript types and Zod schemas

## API Endpoints
- `GET /api/connection/status` - Check MySQL connection
- `GET /api/databases` - List all databases
- `GET /api/databases/:db/tables` - List tables in a database
- `GET /api/databases/:db/tables/:table/columns` - Column info
- `GET /api/databases/:db/tables/:table/data?limit=50&offset=0` - Table data
- `GET /api/customers?limit=&offset=&search=&status=&state=` - Paginated customer list
- `GET /api/customers/stats` - Customer statistics
- `GET /api/orders?limit=&offset=&search=&status=` - Paginated orders list
- `GET /api/orders/stats` - Order statistics (total, by status, recent by day)
- `GET /api/orders/:id` - Order detail with full JSON content fields
- `GET /api/orders/:id/history` - Order history from order_data table (status changes, inbound/outbound content)
- `GET /api/products?limit=&offset=&search=&status=&vendor=&location=&active=` - Paginated product list
- `GET /api/products/stats` - Product statistics (total, active, synced, deleted, avg price, by vendor, by location)
- `GET /api/sales/insights` - Sales insights (units sold, revenue, top products by SKU, daily trends, vendor breakdown) - cached 5min
- `GET /api/errors?limit=&offset=&search=&type=&channelName=` - Paginated error list
- `GET /api/errors/stats` - Error statistics (total, by type, by channel, by vendor)
- `GET /api/errors/:id` - Error detail by internal ID
- `GET /api/suppliers?limit=&offset=&search=` - Paginated supplier list
- `GET /api/suppliers/stats` - Supplier statistics
- `GET /api/suppliers/:name` - Supplier detail by name
- `GET /api/vendors?limit=&offset=&search=&status=&state=` - Paginated vendor list
- `GET /api/vendors/stats` - Vendor statistics (total, synced, toSync, deleted, contact info, by state)
- `GET /api/vendors/:name` - Vendor detail by name
- `GET /api/warehouses` - All warehouses
- `GET /api/purchase-orders?limit=&offset=&search=&status=&vendor=` - Paginated purchase order list
- `GET /api/purchase-orders/stats` - Purchase order statistics (total, by status, by vendor, recent by day)
- `GET /api/purchase-orders/:id` - Purchase order detail with content and invoiceContent JSON
- `GET /api/purchase-orders/:id/history` - Purchase order history from purchase_order_data table
- `GET /api/inventory?limit=&offset=&search=&warehouse=&stockLevel=` - Paginated inventory list with product details
- `GET /api/inventory/stats` - Inventory statistics (total SKUs, units, low/out of stock, by warehouse)
- `POST /api/query` - Execute custom SQL

## Environment Variables
- SSH_HOST, SSH_PORT, SSH_USER, SSH_PRIVATE_KEY - SSH tunnel config
- MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE - MySQL config

## Recent Changes
- 2026-02-13: Added Dropped Products dashboard section showing products ordered in previous period but not recently, with configurable lookback (15/30/45/60 days)
- 2026-02-13: Added date range filter (presets + custom) to Order Pipeline on dashboard
- 2026-02-13: Added Inventory page with stats cards (SKUs, units, low/out of stock), warehouse breakdown chart, searchable/filterable table with product names from products table, detail sheet with stock value
- 2026-02-13: Added Product Sales Insights widgets to dashboard (units sold, revenue, unique SKUs, orders with sales stats cards; top selling products table by SKU; daily units sold bar chart) with server-side batch processing and 5-min cache
- 2026-02-13: Added Errors page with stats cards (total, by type EDI/JSON/XML), search, type/channel filters, table with guide/destination/vendor columns, detail sheet with copyable message/response/detail content
- 2026-02-13: Added Suppliers page with stats cards, searchable table, detail sheet with carrier/address validation settings
- 2026-02-13: Added Vendors page with stats cards, search, status/state filters, table with contact info, detail sheet with company/address/contact sections
- 2026-02-13: Added Warehouses page with card-based grid layout (3 warehouses), detail sheet
- 2026-02-13: Added Purchase Orders page with stats cards, vendor/status filters, searchable table, full-page detail view with 5-tab interface (Overview, PO Details, Line Items, Invoices, Activity Log), ContentViewerDialog for EDI/JSON history
- 2026-02-13: Added Products page with stats cards, top vendors/warehouse bar charts, searchable/filterable table (SKU, status, vendor, location, active), and detail sheet with pricing/margin info
- 2026-02-13: Comprehensive 9-tab order detail page: Overview (summary cards, timeline, metadata), Order Details (deep dive), Line Items (filter/sort/stats), Financials (summary + breakdown), Supplier, Customer & Shipping, Documents (viewer dialogs), Invoices (conditional with discrepancy warning), Activity Log
- 2026-02-13: Replaced inline inbound/outbound content with Dialog modal that parses EDI 850 data and JSON into human-readable cards/tables, with raw data toggle and copy button
- 2026-02-13: Added order history (order_data table) to order detail sheet with timeline view showing status changes and expandable inbound/outbound content
- 2026-02-13: Changed order detail from modal dialog to side sheet (matching customers page)
- 2026-02-13: Refactored backend to use IStorage interface + MySQLStorage pattern (routes no longer contain direct SQL)
- 2026-02-13: Updated color palette to red/black/white brand theme
- 2026-02-13: Replaced pie chart with line chart for recent order activity on Dashboard
- 2026-02-13: Added Orders page with searchable/filterable table, and detail dialog with parsed JSON content
- 2026-02-13: Added Customers page with stats, search, filters, and detail sheet
- 2026-02-13: Added Dashboard with interactive US/Canada maps showing customer distribution
- 2026-02-13: Initial build - SSH tunnel MySQL connection, database browser UI, query runner
