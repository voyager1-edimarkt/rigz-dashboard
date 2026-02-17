# EDI Markt Dashboard

## Overview
A fullstack JavaScript business dashboard application for managing orders, customers, products, vendors, purchase orders, inventory, and more. Connects to an external MySQL database via SSH tunnel and integrates with Odoo ERP via JSON-RPC API.

## Project Architecture
- **Frontend**: React 18 + Vite + TypeScript with Tailwind CSS and shadcn/ui components
- **Backend**: Express 5 (Node.js) serving both API and frontend
- **Database**: External MySQL via SSH tunnel (not Replit's built-in Postgres)
- **External API**: Odoo ERP integration for orders, products, invoices, partners
- **Routing**: wouter for frontend routing
- **State Management**: TanStack React Query v5

## Project Structure
```
client/               # Frontend React application
  src/
    components/       # Reusable UI components
    pages/            # Page components (Dashboard, Customers, Orders, etc.)
    hooks/            # Custom React hooks
    lib/              # Utility libraries
    App.tsx           # Main app with routing
    main.tsx          # Entry point
    index.css         # Global styles with Tailwind
  public/             # Static assets
server/               # Backend Express server
  index.ts            # Server entry point (port 5000)
  routes.ts           # API route definitions
  storage.ts          # Storage interface
  mysql-storage.ts    # MySQL storage implementation
  mysql.ts            # MySQL connection via SSH tunnel
  odoo.ts             # Odoo ERP client
  vite.ts             # Vite dev server middleware
  static.ts           # Production static file serving
shared/
  schema.ts           # Shared TypeScript types and Zod schemas
script/
  build.ts            # Production build script
.env                  # Environment variables (Odoo, SSH, MySQL config)
```

## Configuration
- **Environment Variables**: Stored in `.env` file, loaded via `dotenv`
  - `ODOO_URL`, `ODOO_DB`, `ODOO_USER`, `ODOO_PWD` - Odoo API credentials
  - `SSH_HOST`, `SSH_PORT`, `SSH_USER`, `SSH_PRIVATE_KEY` - SSH tunnel config
  - `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` - MySQL config
- **Port**: Server runs on port 5000 (0.0.0.0)
- **Build**: `npm run build` compiles frontend (Vite) and backend (esbuild)
- **Start**: `npm run start` runs production build

## Recent Changes
- 2026-02-17: Initial Replit environment setup, configured workflow and deployment
