# 🐧 VPS Deployment Guide (Ubuntu / Debian / Nginx / PM2)

This guide provides the complete, production-grade deployment process for **CoreCart** on a Virtual Private Server (VPS) running Ubuntu 20.04, 22.04, or 24.04.

---

## 🏗️ Architecture Overview

```
[Internet User]
       │ (HTTPS :443 / HTTP :80)
       ▼
  [Nginx Web Server] (SSL Termination & Static Proxy)
       │ (HTTP Reverse Proxy :3000)
       ▼
 [PM2 Process Manager] -> [Node.js Express Engine (dist/server.cjs)]
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
           [Turso Cloud SQLite /     [Cloudflare R2
            PostgreSQL Database]      Media Bucket]
```

---

## 🛠️ Step 1: Server Preparation & Tooling Installation

Connect to your VPS via SSH:
```bash
ssh root@YOUR_SERVER_IP
```

Update packages and install **Node.js (LTS 20.x)**, **Git**, **Nginx**, and **PM2**:

```bash
# 1. Update system packages
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 20.x from NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx build-essential

# 3. Verify installations
node -v   # Should output v20.x.x
npm -v    # Should output v10.x.x

# 4. Install PM2 process manager globally
sudo npm install -g pm2
```

---

## 📂 Step 2: Clone / Upload the Application

Create an application directory under `/var/www`:

```bash
# Create directory and assign permissions
sudo mkdir -p /var/www/corecart
sudo chown -R $USER:$USER /var/www/corecart
cd /var/www/corecart

# Option A: Clone from Git
git clone https://github.com/your-username/your-repo.git .

# Option B: Or SCP / SFTP files directly from local machine
```

---

## 📝 Step 3: Configure the `.env` File

Create and edit the production `.env` file:

```bash
nano /var/www/corecart/.env
```

Paste your production configuration:

```env
# Database Type (turso or postgres)
DATABASE_TYPE="turso"
TURSO_DATABASE_URL="libsql://techshop-rajboss89130.aws-ap-south-1.turso.io"
TURSO_AUTH_TOKEN="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODc5NDA2NDYsImlkIjoiMDFhMDQ5OGQtYWYwMS03YzM2LTk0ZTYtYjYxZGM2MzMxZGE1Iiwia2lkIjoiUWhEdDg3YTBfalp2SlFJdFFQSWpBR0xqRnJSNTdTQURaNTNUZGk5b0pMYyIsInJpZCI6IjEyYWE2NzgyLTRlOTYtNGE4MC04ZmQ3LTRlMDgyMDc5NTdmNyJ9.CqHwwm4M6RaW2qpSaJ8d0dNfEr0UyxKjc0U2fbQtbLICO-kNE-QNbn7H4vqDQAFXAfC5DWBET0E412F1yw9rDg"

# Security & App Config
JWT_SECRET="Ko0Pfk29g8hDw63CXaE4xD7ex299tEYn4Xq4zlXYpYs="
NODE_ENV="production"
PORT=3000
APP_URL="https://yourdomain.com"

# Cloudflare R2 Bucket (Optional)
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME=""
R2_PUBLIC_URL=""
```
*(Save and exit nano: `Ctrl + O` then `Enter`, then `Ctrl + X`)*

---

## 🔨 Step 4: Install Dependencies & Build the Project

```bash
cd /var/www/corecart

# 1. Install dependencies
npm install

# 2. Build the production bundle
npm run build
```

Verify that `dist/server.cjs` exists.

---

## ⚡ Step 5: Start & Manage the App with PM2

Start the application under PM2 process management:

```bash
cd /var/www/corecart

# Start the application using npm start or directly node dist/server.cjs
pm2 start dist/server.cjs --name "corecart-app"

# Save PM2 state so it restarts automatically on server reboot
pm2 save
pm2 startup
# (Run the sudo env PATH=... command printed on screen by pm2 startup)
```

### Useful PM2 Management Commands:
```bash
pm2 status              # View running application status
pm2 logs corecart-app  # View real-time application logs
pm2 restart corecart-app # Restart application after update
pm2 stop corecart-app  # Stop application
```

---

## 🌐 Step 6: Configure Nginx as a Reverse Proxy

Create an Nginx configuration file for your domain:

```bash
sudo nano /etc/nginx/sites-available/corecart
```

Paste the following Nginx configuration (replace `yourdomain.com` with your real domain):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Client body limit for high-resolution image uploads
    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the configuration and test Nginx:

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/corecart /etc/nginx/sites-enabled/

# Test syntax
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 🔒 Step 7: Secure with Free SSL (Let's Encrypt / Certbot)

Install Certbot for Nginx and provision your free SSL certificate:

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain and install SSL automatically
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test automatic certificate renewal
sudo certbot renew --dry-run
```

---

## 🔄 Step 8: Updating the Application in the Future

Whenever you pull changes or make updates, run:

```bash
cd /var/www/corecart
git pull origin main
npm install
npm run build
pm2 restart corecart-app
```
