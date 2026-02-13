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
- `client/src/pages/dashboard.tsx` - Dashboard with US/Canada maps showing customer distribution
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
- `POST /api/query` - Execute custom SQL

## Environment Variables
- SSH_HOST, SSH_PORT, SSH_USER, SSH_PRIVATE_KEY - SSH tunnel config
- MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE - MySQL config

## Recent Changes
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
