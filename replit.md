# MySQL Explorer - Database Manager

## Overview

MySQL Explorer is a full-stack web application that provides a GUI for browsing MySQL databases, exploring table structures, and running queries through a secure SSH tunnel. It connects to a remote MySQL database on an EC2 instance via SSH tunneling and presents business data (customers, orders, products, purchase orders, suppliers, vendors, warehouses, inventory, and errors) through dedicated views with filtering, pagination, and statistics. The app also includes a dashboard with geographic data visualizations (US states and Canadian provinces maps), charts, and a raw SQL query runner.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

- **Framework**: React with TypeScript, built with Vite
- **Routing**: Wouter (lightweight client-side router)
- **State Management**: TanStack React Query for server state (data fetching, caching)
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives with Tailwind CSS
- **Charts**: Recharts for data visualization (line charts, bar charts)
- **Maps**: react-simple-maps with TopoJSON data for US states and Canadian provinces
- **Styling**: Tailwind CSS with CSS variables for theming, light mode only (hardcoded)
- **Path aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend

- **Runtime**: Node.js with Express
- **Language**: TypeScript, executed via tsx
- **Database Connection**: MySQL via `mysql2/promise`, accessed through an SSH tunnel using the `ssh2` library
- **SSH Tunnel**: Creates a local TCP tunnel to forward MySQL connections through an EC2 instance (SSH key-based auth)
- **Architecture Pattern**: Storage interface (`IStorage`) with a MySQL implementation (`MySQLStorage`). The storage layer abstracts all database operations.
- **API Style**: REST API under `/api/` prefix. All routes registered in `server/routes.ts`.

### Key API Endpoints

- `GET /api/connection/status` - Test MySQL connection
- `GET /api/databases` - List databases
- `GET /api/databases/:database/tables` - List tables in a database
- `GET /api/databases/:database/tables/:table/columns` - Get column metadata
- `GET /api/databases/:database/tables/:table/data` - Get paginated table data
- `POST /api/query` - Run arbitrary SQL queries
- Domain-specific endpoints for customers, orders, products, purchase orders, suppliers, vendors, warehouses, inventory, errors, and dashboard statistics

### Data Layer

- **Primary Database**: Remote MySQL accessed via SSH tunnel (NOT PostgreSQL for app data)
- **Drizzle/PostgreSQL**: The project has `drizzle.config.ts` and `drizzle-kit` configured pointing to PostgreSQL via `DATABASE_URL`. This appears to be for potential session storage or metadata, but the core application data comes from the remote MySQL database.
- **Schema**: `shared/schema.ts` contains Zod schemas for validation and TypeScript types shared between client and server. It does NOT use Drizzle table definitions for the MySQL data — the MySQL queries are written as raw SQL.

### Build System

- **Development**: `tsx server/index.ts` with Vite dev server middleware for HMR
- **Production Build**: Vite builds the client to `dist/public/`, esbuild bundles the server to `dist/index.cjs`
- **Key build detail**: Server build externalizes most dependencies except an allowlist of commonly used packages to optimize cold start times

### Project Structure

```
client/                  # Frontend React app
  src/
    components/          # Shared components
      ui/                # shadcn/ui components
    pages/               # Route pages (dashboard, customers, orders, etc.)
    hooks/               # Custom React hooks
    lib/                 # Utilities (queryClient, cn helper)
  public/                # Static assets (map JSON files)
server/                  # Backend Express server
  index.ts               # Entry point, app setup
  routes.ts              # API route registration
  storage.ts             # IStorage interface definition
  mysql-storage.ts       # MySQL implementation of IStorage
  mysql.ts               # SSH tunnel + MySQL connection management
  vite.ts                # Vite dev server integration
  static.ts              # Production static file serving
shared/                  # Shared between client and server
  schema.ts              # Zod schemas and TypeScript types
migrations/              # Drizzle migration files (PostgreSQL)
```

## External Dependencies

### Core Services

- **MySQL Database**: Remote MySQL server (default database: "data") accessed via SSH tunnel
- **SSH Tunnel**: Connects to EC2 instance (default: 54.161.236.27:22) using RSA private key authentication, then forwards to MySQL on the remote host
- **PostgreSQL**: Required by Drizzle configuration (`DATABASE_URL` env var), used for session storage or metadata

### Required Environment Variables

- `DATABASE_URL` - PostgreSQL connection string (required by Drizzle)
- `SSH_HOST` - SSH server hostname (default: 54.161.236.27)
- `SSH_PORT` - SSH port (default: 22)
- `SSH_USER` - SSH username (default: ec2-user)
- `SSH_PRIVATE_KEY` - RSA private key for SSH authentication
- `MYSQL_HOST` - MySQL host on remote server (default: 127.0.0.1)
- `MYSQL_PORT` - MySQL port (default: 3306)
- `MYSQL_USER` - MySQL username (default: runtime)
- `MYSQL_PASSWORD` - MySQL password
- `MYSQL_DATABASE` - Default MySQL database (default: data)

### Key NPM Packages

- **Frontend**: React, Vite, TanStack React Query, Wouter, Recharts, react-simple-maps, shadcn/ui (Radix UI + Tailwind CSS)
- **Backend**: Express, mysql2, ssh2, drizzle-orm, drizzle-zod, zod
- **Session**: connect-pg-simple, express-session