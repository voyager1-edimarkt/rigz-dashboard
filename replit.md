# Rigz Dashboard

## Overview
A full-stack business dashboard application built with Express (backend) and React/Vite (frontend). It connects to an external MySQL database via SSH tunnel and integrates with Odoo ERP for sales, purchase orders, invoices, products, customers, vendors, and inventory management.

## Architecture
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts, wouter (routing)
- **Backend**: Express 5, TypeScript, tsx (dev runner)
- **Data Sources**: MySQL (via SSH tunnel), Odoo JSON-RPC API
- **Build**: Vite (client) + esbuild (server) via `script/build.ts`

## Project Structure
```
client/           - React frontend (Vite)
  src/
    components/   - UI components (shadcn/ui based)
    pages/        - Route pages
    hooks/        - Custom React hooks
    lib/          - Utility functions
  public/         - Static assets
server/           - Express backend
  index.ts        - Entry point (port 5000)
  routes.ts       - API routes
  mysql.ts        - MySQL connection via SSH tunnel
  mysql-storage.ts- IStorage implementation for MySQL
  odoo.ts         - Odoo ERP client
  vite.ts         - Vite dev middleware
  static.ts       - Static file serving (production)
shared/           - Shared types/schemas (Zod + Drizzle)
  schema.ts       - Data schemas
script/           - Build scripts
  build.ts        - Production build
attached_assets/  - Uploaded images/assets
```

## Environment Variables (via .env file)
- ODOO_URL, ODOO_DB, ODOO_USER, ODOO_PWD - Odoo API credentials
- SSH_HOST, SSH_USER, SSH_PRIVATE_KEY - SSH tunnel for MySQL
- MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE - MySQL credentials

## Running
- Dev: `npm run dev` (serves on port 5000)
- Build: `npm run build`
- Production: `npm run start`

## Recent Changes
- 2026-02-19: Initial setup in Replit environment, added nanoid dependency, set tsconfig target to ES2020
