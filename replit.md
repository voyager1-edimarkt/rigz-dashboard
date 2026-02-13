# MySQL Explorer - Database Manager

## Overview
A web-based MySQL database manager that connects to a remote MySQL server through an SSH tunnel. Users can browse databases, explore table structures, view data with pagination, and run custom SQL queries.

## Architecture
- **Frontend**: React + Vite with shadcn/ui components, TanStack Query for data fetching
- **Backend**: Express.js with SSH tunnel (ssh2) + MySQL (mysql2) connection
- **Connection**: SSH tunnel to remote server (54.161.236.27) → MySQL on localhost:3306

## Key Files
- `server/mysql.ts` - SSH tunnel + MySQL connection management
- `server/routes.ts` - API endpoints for databases/tables/columns/data/queries
- `client/src/App.tsx` - Main app with sidebar layout
- `client/src/components/app-sidebar.tsx` - Database/table browser sidebar
- `client/src/pages/table-view.tsx` - Table structure + data viewer with pagination
- `client/src/pages/query-runner.tsx` - SQL query runner
- `client/src/components/connection-badge.tsx` - Connection status indicator
- `shared/schema.ts` - TypeScript types and Zod schemas

## API Endpoints
- `GET /api/connection/status` - Check MySQL connection
- `GET /api/databases` - List all databases
- `GET /api/databases/:db/tables` - List tables in a database
- `GET /api/databases/:db/tables/:table/columns` - Column info
- `GET /api/databases/:db/tables/:table/data?limit=50&offset=0` - Table data
- `POST /api/query` - Execute custom SQL

## Environment Variables
- SSH_HOST, SSH_PORT, SSH_USER, SSH_PRIVATE_KEY - SSH tunnel config
- MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE - MySQL config

## Recent Changes
- 2026-02-13: Initial build - SSH tunnel MySQL connection, database browser UI, query runner
