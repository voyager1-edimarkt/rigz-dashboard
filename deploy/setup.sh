#!/bin/bash
set -e

echo "========================================="
echo "  RIGZ Dashboard - AWS VM Setup Script"
echo "========================================="
echo ""

APP_DIR="/opt/rigz-dashboard"
LOG_DIR="/var/log/rigz-dashboard"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root: sudo bash setup.sh"
  exit 1
fi

echo "[1/7] Installing system dependencies..."
if command -v apt-get &> /dev/null; then
  apt-get update -qq
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs nginx
elif command -v yum &> /dev/null; then
  curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
  yum install -y nodejs nginx
elif command -v dnf &> /dev/null; then
  curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
  dnf install -y nodejs nginx
else
  echo "Unsupported package manager. Please install Node.js 20+ and nginx manually."
  exit 1
fi

echo "[2/7] Installing PM2..."
npm install -g pm2

echo "[3/7] Creating application directory..."
mkdir -p "$APP_DIR"
mkdir -p "$LOG_DIR"

echo "[4/7] Copying application files..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Copy necessary files
cp -r "$PROJECT_DIR/dist" "$APP_DIR/"
cp "$PROJECT_DIR/package.json" "$APP_DIR/"
cp "$PROJECT_DIR/package-lock.json" "$APP_DIR/" 2>/dev/null || true
cp "$SCRIPT_DIR/ecosystem.config.cjs" "$APP_DIR/"

# Copy .env if it exists, otherwise copy the example
if [ -f "$PROJECT_DIR/.env" ]; then
  cp "$PROJECT_DIR/.env" "$APP_DIR/.env"
elif [ -f "$SCRIPT_DIR/.env" ]; then
  cp "$SCRIPT_DIR/.env" "$APP_DIR/.env"
else
  cp "$SCRIPT_DIR/.env.example" "$APP_DIR/.env"
  echo ""
  echo "WARNING: No .env file found. Copied .env.example to $APP_DIR/.env"
  echo "Please edit $APP_DIR/.env with your actual credentials before starting."
  echo ""
fi

echo "[5/7] Installing production dependencies..."
cd "$APP_DIR"
npm install --omit=dev

echo "[6/7] Setting up Nginx..."
cp "$SCRIPT_DIR/nginx.conf" /etc/nginx/sites-available/rigz-dashboard 2>/dev/null || \
cp "$SCRIPT_DIR/nginx.conf" /etc/nginx/conf.d/rigz-dashboard.conf 2>/dev/null || true

if [ -d "/etc/nginx/sites-available" ]; then
  ln -sf /etc/nginx/sites-available/rigz-dashboard /etc/nginx/sites-enabled/
  rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
fi

nginx -t && systemctl restart nginx
systemctl enable nginx

echo "[7/7] Starting application with PM2..."
cd "$APP_DIR"
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || pm2 startup

echo ""
echo "========================================="
echo "  Setup Complete!"
echo "========================================="
echo ""
echo "  App directory: $APP_DIR"
echo "  Logs:          $LOG_DIR"
echo "  Config:        $APP_DIR/.env"
echo ""
echo "  Useful commands:"
echo "    pm2 status              - Check app status"
echo "    pm2 logs rigz-dashboard - View app logs"
echo "    pm2 restart rigz-dashboard - Restart app"
echo ""
echo "  Your dashboard is now available at:"
echo "    http://YOUR_VM_IP"
echo ""
echo "  Default login: admin / admin123"
echo "  (Change this password after first login!)"
echo ""
