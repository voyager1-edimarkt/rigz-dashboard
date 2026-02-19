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

## Authentication
- Simple session-based login using PostgreSQL (Replit built-in)
- Tables: `users` (id, username, password hash), `session` (express-session store)
- Default admin: username `admin`, password `admin123`
- Auth files: `server/auth.ts` (DB init + verify), login routes in `server/index.ts`
- Frontend: `client/src/pages/login.tsx`, auth check in `client/src/App.tsx`
- SQL setup script for MySQL migration: `auth-setup.sql`

## Environment Variables (via .env file)
- ODOO_URL, ODOO_DB, ODOO_USER, ODOO_PWD - Odoo API credentials
- SSH_HOST, SSH_USER, SSH_PRIVATE_KEY - SSH tunnel for MySQL
- MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE - MySQL credentials
- DATABASE_URL - PostgreSQL connection (auto-set by Replit for auth)

## Running
- Dev: `npm run dev` (serves on port 5000)
- Build: `npm run build`
- Production: `npm run start`

## AWS VM Deployment
- Deploy files in `deploy/` directory
- `deploy/setup.sh` - Automated setup script (installs Node.js, PM2, Nginx)
- `deploy/build-vm.sh` - Builds production bundle with MySQL auth (no PostgreSQL needed)
- `deploy/ecosystem.config.cjs` - PM2 process manager config
- `deploy/nginx.conf` - Nginx reverse proxy config
- `deploy/.env.example` - Environment variable template
- `deploy/DEPLOY-GUIDE.md` - Full deployment instructions
- VM build uses direct MySQL connection (no SSH tunnel) and MySQL-based session store

## Recent Changes
- 2026-02-19: Created AWS VM migration package (deploy/) with setup script, PM2, Nginx, MySQL auth
- 2026-02-19: Added logout button to sidebar
- 2026-02-19: Added "Powered By EDIMarkt Technologies" to sidebar footer
- 2026-02-19: Updated favicon to RIGZ logo from gorigz.com
- 2026-02-19: Added simple login system with PostgreSQL session store, bcryptjs password hashing, protected all API routes
- 2026-02-19: Made dashboard KPI cards non-clickable (removed hover/navigate)
- 2026-02-19: Initial setup in Replit environment, added nanoid dependency, set tsconfig target to ES2020
