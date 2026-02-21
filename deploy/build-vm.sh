#!/bin/bash
set -e

echo "========================================="
echo "  RIGZ Dashboard - Build for VM Deploy"
echo "========================================="
echo ""

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo "[1/4] Preparing VM server files..."
cp deploy/mysql-direct.ts server/mysql.ts.bak 2>/dev/null || true
cp server/mysql.ts server/mysql.ts.original 2>/dev/null || true
cp deploy/mysql-direct.ts server/mysql.ts
cp server/auth.ts server/auth.ts.original 2>/dev/null || true
cp deploy/auth-mysql.ts server/auth.ts
cp deploy/mysql-session-store.ts server/mysql-session-store.ts

echo "[2/4] Updating server entry point for VM..."
cp server/index.ts server/index.ts.original 2>/dev/null || true
cp deploy/index-vm.ts server/index.ts

echo "[3/4] Building client and server..."
npm run build

echo "[4/4] Restoring Replit server files..."
cp server/mysql.ts.original server/mysql.ts 2>/dev/null || true
cp server/auth.ts.original server/auth.ts 2>/dev/null || true
cp server/index.ts.original server/index.ts 2>/dev/null || true
rm -f server/mysql.ts.original server/auth.ts.original server/index.ts.original server/mysql.ts.bak
rm -f server/mysql-session-store.ts

echo ""
echo "Build complete! Files are in dist/"
echo ""
echo "Next steps:"
echo "  1. Copy the entire project to your VM"
echo "  2. Run: sudo bash deploy/setup.sh"
echo ""
