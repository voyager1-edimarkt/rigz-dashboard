# RIGZ Dashboard

## Overview

RIGZ is a business data management dashboard for an e-commerce/supply chain operation. It provides a React frontend with an Express backend that connects to a remote MySQL database (via SSH tunnel) to display and manage business entities: customers, orders, products, purchase orders, suppliers, vendors, warehouses, inventory, and errors. The dashboard also integrates with Odoo ERP via JSON-RPC API. It includes interactive data visualizations (charts, maps), detailed drill-down views for orders and purchase orders, a raw SQL query runner, and a geographic distribution view using US state and Canadian province maps.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript, bundled by Vite
- **Routing**: Wouter (lightweight client-side router)
- **State Management / Data Fetching**: TanStack React Query for server state. Queries use the URL path as the query key and fetch from `/api/*` endpoints.
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives with Tailwind CSS. Components live in `client/src/components/ui/`.
- **Charts**: Recharts (LineChart, BarChart)
- **Maps**: react-simple-maps with TopoJSON data for US states (`states-10m.json`) and Canadian provinces (`canada-provinces.json`) stored in `client/public/`
- **Styling**: Tailwind CSS with CSS custom properties for theming. Light mode only (hardcoded in ThemeProvider). Custom color tokens defined in `client/src/index.css`.
- **Path Aliases**: `@/` → `client/src/`, `@shared/` → `shared/`, `@assets/` → `attached_assets/`

### Backend
- **Runtime**: Node.js with Express, written in TypeScript, executed via `tsx`
- **Primary Data Source**: Remote MySQL database accessed through an SSH tunnel (ssh2 library). The SSH tunnel connects to an EC2 instance and forwards to a MySQL server. Connection config comes from environment variables (`SSH_HOST`, `SSH_PRIVATE_KEY`, `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`).
- **Storage Pattern**: Interface-based (`IStorage` in `server/storage.ts`) with `MySQLStorage` implementation (`server/mysql-storage.ts`). This abstraction covers all business domain queries (customers, orders, products, purchase orders, suppliers, vendors, warehouses, inventory, errors, sales insights).
- **Odoo Integration**: `server/odoo.ts` implements a JSON-RPC client for Odoo ERP. Configured via `ODOO_URL`, `ODOO_DB`, `ODOO_USER`, `ODOO_PWD` environment variables. Used for syncing/reading ERP data.
- **API Structure**: REST endpoints under `/api/` including:
  - `/api/connection/status` - MySQL connection health check
  - `/api/databases` - List databases
  - `/api/databases/:database/tables` - List tables
  - `/api/databases/:database/tables/:table/columns` - Column metadata
  - `/api/databases/:database/tables/:table/data` - Paginated table data
  - `/api/query` - Raw SQL query execution
  - Domain-specific endpoints for customers, orders, products, purchase orders, suppliers, vendors, warehouses, inventory, errors, sales insights
- **Dev Server**: Vite dev server in middleware mode with HMR (configured in `server/vite.ts`)
- **Production**: Static files served from `dist/public` after Vite build; server bundled with esbuild to `dist/index.cjs`

### Shared Layer
- **Schema / Types**: `shared/schema.ts` defines Zod schemas and TypeScript interfaces for all data types (connection status, database info, table info, customers, orders, products, purchase orders, suppliers, vendors, warehouses, inventory, errors, sales insights). This is shared between frontend and backend.
- **Note**: While `drizzle.config.ts` exists configured for PostgreSQL, the actual data storage uses MySQL via SSH tunnel. The Drizzle/PostgreSQL setup exists in config but the app's primary data operations go through the MySQL storage layer. The `DATABASE_URL` environment variable is expected for Drizzle but may not be actively used for the main application flow.

### Build System
- **Development**: `npm run dev` runs `tsx server/index.ts` with `NODE_ENV=development`
- **Production Build**: `npm run build` runs `script/build.ts` which builds the client with Vite and bundles the server with esbuild. Key dependencies are bundled (not externalized) to reduce cold start times.
- **Database Migrations**: `npm run db:push` uses drizzle-kit push (PostgreSQL)

### Key Pages
| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Executive overview with stats, charts, maps |
| `/sales-flow` | Sales Flow | Orders & Invoices with inline invoice status |
| `/sales-flow/customers` | Customers | Odoo customer list |
| `/sales-flow/orders/:id` | Order Detail | Deep-dive Odoo order view with line items, invoices, timeline |
| `/purchase-flow` | Purchase Flow | POs & Bills combined with tabs |
| `/purchase-flow/orders/:id` | PO Detail | Deep-dive Odoo PO view with line items, bills, timeline |
| `/purchase-flow/bills/:id` | Bill Detail | Deep-dive Odoo bill view with line items, vendor, timeline |
| `/odoo/vendors` | Vendors | Odoo vendor list with parent-only filtering and drill-down |
| `/odoo/vendors/:id` | Vendor Detail | Deep-dive Odoo vendor view with KPIs, POs, bills, top products, sub-contacts |
| `/odoo/products` | Products | Odoo product catalog |
| `/customers` | Customers (Legacy) | Legacy MySQL customer list |
| `/orders` | Orders (Legacy) | Legacy MySQL order list |
| `/orders/:id` | Order Detail (Legacy) | Legacy order view |
| `/products` | Products (Legacy) | Legacy product catalog |
| `/purchase-orders` | Purchase Orders (Legacy) | Legacy PO list |
| `/purchase-orders/:id` | PO Detail (Legacy) | Legacy PO detail |
| `/suppliers` | Suppliers | Supplier management |
| `/vendors` | Vendors (Legacy) | Legacy vendor management |
| `/warehouses` | Warehouses | Warehouse overview |
| `/inventory` | Inventory | Inventory tracking with charts |
| `/errors` | Errors | Error log viewer |
| `/table-view` | Table View | Raw database table browser |
| `/query-runner` | Query Runner | SQL query execution interface |

## External Dependencies

### Databases
- **MySQL** (primary): Remote MySQL database accessed via SSH tunnel to an EC2 instance. All business data (customers, orders, products, etc.) lives here. Connection requires SSH private key and MySQL credentials.
- **PostgreSQL** (configured but secondary): Drizzle ORM is configured with PostgreSQL dialect via `DATABASE_URL`. Used for potential session storage or future schema management.

### External Services
- **Odoo ERP**: JSON-RPC integration at `https://rigz.odoo.com/jsonrpc`. Used for product, sale order, and purchase order operations. Requires `ODOO_URL`, `ODOO_DB`, `ODOO_USER`, `ODOO_PWD` environment variables.
- **SSH Tunnel**: Connects to EC2 instance (default `54.161.236.27:22`) to access MySQL. Requires `SSH_HOST`, `SSH_PORT`, `SSH_USER`, `SSH_PRIVATE_KEY`.

### Environment Variables Required
| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string (for Drizzle) |
| `SSH_HOST` | SSH tunnel target host |
| `SSH_PORT` | SSH tunnel port (default 22) |
| `SSH_USER` | SSH username (default ec2-user) |
| `SSH_PRIVATE_KEY` | RSA private key for SSH |
| `MYSQL_HOST` | MySQL host (default 127.0.0.1, via tunnel) |
| `MYSQL_PORT` | MySQL port (default 3306) |
| `MYSQL_USER` | MySQL username |
| `MYSQL_PASSWORD` | MySQL password |
| `MYSQL_DATABASE` | MySQL database name (default "data") |
| `ODOO_URL` | Odoo JSON-RPC endpoint |
| `ODOO_DB` | Odoo database name |
| `ODOO_USER` | Odoo username |
| `ODOO_PWD` | Odoo API key/password |

### Key NPM Packages
- **Frontend**: React, Vite, TanStack React Query, Wouter, Recharts, react-simple-maps, shadcn/ui (Radix UI + Tailwind CSS), Zod
- **Backend**: Express, mysql2, ssh2, drizzle-orm, drizzle-kit, Zod, connect-pg-simple, express-session
- **Shared**: Zod (schema validation and type inference)