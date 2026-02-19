# RIGZ Dashboard - AWS VM Deployment Guide

## Prerequisites
- Linux VM (Ubuntu, Amazon Linux, or similar)
- MySQL already running on the VM
- Root or sudo access

## Quick Deploy (Automated)

### Step 1: Build the production bundle
On this Replit machine (or any dev machine with Node.js):
```bash
bash deploy/build-vm.sh
```

### Step 2: Copy project to your VM
```bash
# From your local machine or Replit shell:
scp -r /home/runner/workspace ec2-user@YOUR_VM_IP:/tmp/rigz-dashboard
```

### Step 3: Configure environment
```bash
# SSH into your VM
ssh ec2-user@YOUR_VM_IP

# Copy and edit the config file
cd /tmp/rigz-dashboard
cp deploy/.env.example deploy/.env
nano deploy/.env
```

Fill in your actual values:
- `MYSQL_*` - Your MySQL database credentials
- `ODOO_*` - Your Odoo ERP credentials  
- `SESSION_SECRET` - Change to a random string

### Step 4: Run the setup script
```bash
sudo bash /tmp/rigz-dashboard/deploy/setup.sh
```

This automatically:
- Installs Node.js 20 and Nginx
- Installs PM2 process manager
- Copies built files to `/opt/rigz-dashboard`
- Configures Nginx reverse proxy
- Starts the app and enables auto-restart on reboot

### Step 5: Access your dashboard
Open `http://YOUR_VM_IP` in your browser.
- Default login: `admin` / `admin123`

---

## Manual Deploy

If you prefer to set things up manually:

### 1. Install Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs
```

### 2. Install PM2
```bash
sudo npm install -g pm2
```

### 3. Build & copy
```bash
# Build on dev machine
bash deploy/build-vm.sh

# Copy dist/, package.json, deploy/ to your VM
scp -r dist package.json deploy ec2-user@YOUR_VM_IP:/opt/rigz-dashboard/
```

### 4. Install dependencies
```bash
cd /opt/rigz-dashboard
npm install --omit=dev
```

### 5. Create .env
```bash
cp deploy/.env.example .env
nano .env   # Fill in your credentials
```

### 6. Create auth tables
The app auto-creates the `users` and `session` tables on first start.

### 7. Start with PM2
```bash
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup
```

### 8. Set up Nginx (optional but recommended)
```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/rigz-dashboard
sudo ln -s /etc/nginx/sites-available/rigz-dashboard /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
```

---

## Useful Commands

| Command | Description |
|---------|-------------|
| `pm2 status` | Check if the app is running |
| `pm2 logs rigz-dashboard` | View real-time logs |
| `pm2 restart rigz-dashboard` | Restart the app |
| `pm2 stop rigz-dashboard` | Stop the app |
| `pm2 monit` | Monitor CPU/memory usage |

## Updating

To deploy a new version:
```bash
# On dev machine: rebuild
bash deploy/build-vm.sh

# Copy new dist/ to VM
scp -r dist ec2-user@YOUR_VM_IP:/opt/rigz-dashboard/

# On VM: restart
pm2 restart rigz-dashboard
```

## Troubleshooting

**App won't start?**
- Check logs: `pm2 logs rigz-dashboard`
- Verify .env file has correct MySQL credentials
- Test MySQL connection: `mysql -u runtime -p -h 127.0.0.1 data`

**Can't access from browser?**
- Check security group allows port 80 (and 443 for HTTPS)
- Verify Nginx is running: `sudo systemctl status nginx`
- Check if app is running: `pm2 status`

**Session/login issues?**
- The `session` and `users` tables are auto-created in your MySQL database
- Default login: admin / admin123
