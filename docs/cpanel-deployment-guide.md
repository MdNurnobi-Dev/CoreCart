# 🚀 cPanel Deployment Guide (Step-by-Step)

This guide walks you through deploying **TechStore** onto any cPanel hosting account that provides the **"Setup Node.js App"** (CloudLinux / cPanel Passenger) feature.

---

## 📋 Prerequisites
- A cPanel hosting account with **Node.js Selector** enabled (Node.js version `18.x`, `20.x`, or `22.x` recommended).
- Access to **cPanel File Manager** or **FTP/SSH**.
- An existing domain or subdomain assigned in cPanel (e.g., `store.yourdomain.com` or `yourdomain.com`).

---

## 🛠️ Step 1: Upload Project Files to cPanel

1. On your local machine, zip the project repository *(excluding `node_modules` and `.git`)*.
2. In **cPanel**, open **File Manager**.
3. Create a folder in your home directory (for example: `/home/youruser/techstore`).
   > ⚠️ **Important:** Do NOT upload into `public_html` directly. Keep your project source in `/home/youruser/techstore`.
4. Upload your `.zip` archive into this folder and extract it.

---

## ⚙️ Step 2: Create the Node.js Application in cPanel

1. In cPanel, search for and open **"Setup Node.js App"**.
2. Click **Create Application**.
3. Fill in the fields as follows:

| Field | Recommended Value | Description |
| :--- | :--- | :--- |
| **Node.js version** | `20.x` or `22.x` | Select modern LTS Node.js |
| **Application mode** | `Production` | Optimized for speed and security |
| **Application root** | `techstore` | Relative path to your uploaded folder |
| **Application URL** | `yourdomain.com` | The domain or subdomain mapped to the app |
| **Application startup file** | `dist/server.cjs` *(or `server.js`)* | The compiled entry point created after build |

4. Click **Create** (or **Save**).

---

## 📝 Step 3: Configure Environment Variables (`.env`)

You have two options to configure environment variables in cPanel:

### Option A: Direct `.env` file in the project root (Recommended & Easiest)
1. In cPanel **File Manager**, navigate inside your project directory (e.g. `/home/youruser/techstore`).
2. Ensure "Show Hidden Files (dotfiles)" is enabled in File Manager Settings.
3. Create a new file named `.env`.
4. Paste the configuration template corresponding to your database choice (e.g., Turso Cloud SQLite or Neon PostgreSQL).

#### Example `.env` (Turso Cloud SQLite — Ready to use):
```env
# Database Type (turso or postgres)
DATABASE_TYPE="turso"
TURSO_DATABASE_URL="libsql://techshop-rajboss89130.aws-ap-south-1.turso.io"
TURSO_AUTH_TOKEN="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODc5NDA2NDYsImlkIjoiMDFhMDQ5OGQtYWYwMS03YzM2LTk0ZTYtYjYxZGM2MzMxZGE1Iiwia2lkIjoiUWhEdDg3YTBfalp2SlFJdFFQSWpBR0xqRnJSNTdTQURaNTNUZGk5b0pMYyIsInJpZCI6IjEyYWE2NzgyLTRlOTYtNGE4MC04ZmQ3LTRlMDgyMDc5NTdmNyJ9.CqHwwm4M6RaW2qpSaJ8d0dNfEr0UyxKjc0U2fbQtbLICO-kNE-QNbn7H4vqDQAFXAfC5DWBET0E412F1yw9rDg"

# Security & Secrets
JWT_SECRET="Ko0Pfk29g8hDw63CXaE4xD7ex299tEYn4Xq4zlXYpYs="
NODE_ENV="production"
PORT=3000
APP_URL="https://yourdomain.com"

# Optional Cloudflare R2 Media & Backup Storage
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME=""
R2_PUBLIC_URL=""
```

### Option B: Add Environment Variables via cPanel UI
In the **Setup Node.js App** screen, scroll down to **"Environment variables"**, click **Add Variable**, and add key-value pairs (e.g., `DATABASE_TYPE=turso`, `TURSO_DATABASE_URL=...`, etc.).

---

## 📦 Step 4: Install Dependencies & Run the Production Build

1. In the **Setup Node.js App** page, locate the command to enter your virtual environment. It looks like:
   ```bash
   source /home/youruser/nodevenv/techstore/20/bin/activate && cd /home/youruser/techstore
   ```
2. Copy this command.
3. Open **cPanel Terminal** (or connect via SSH) and paste the command.
4. Run the following installation and build commands:
   ```bash
   # 1. Install all production and dev dependencies
   npm install

   # 2. Build the React frontend (Vite) and bundle backend (esbuild)
   npm run build
   ```
5. Verify that the `dist/` directory was generated and contains:
   - `dist/index.html`
   - `dist/assets/`
   - `dist/server.cjs`

---

## 🔄 Step 5: Start / Restart the Application

1. Return to the **"Setup Node.js App"** page in cPanel.
2. Ensure **Application startup file** is set to: `dist/server.cjs`.
3. Click the **"Restart"** button at the top right.
4. Open your browser and visit `https://yourdomain.com`.

---

## 🌐 Optional: cPanel Passenger `.htaccess` Routing Check

cPanel automatically writes routing rules to `public_html/.htaccess`. If your domain shows a 404 or directory listing, ensure your `.htaccess` contains:

```apache
# DO NOT REMOVE. CLOUDLINUX PASSENGER CONFIGURATION BEGIN
PassengerAppRoot "/home/youruser/techstore"
PassengerBaseURI "/"
PassengerNodejs "/home/youruser/nodevenv/techstore/20/bin/node"
PassengerAppType node
PassengerStartupFile dist/server.cjs
# DO NOT REMOVE. CLOUDLINUX PASSENGER CONFIGURATION END
```

---

## 🔍 Troubleshooting cPanel Issues

| Symptom | Probable Cause | Fix |
| :--- | :--- | :--- |
| **503 Service Unavailable** | The Node process crashed on start or `dist/server.cjs` does not exist. | Open cPanel Terminal, run `npm run build`, and check logs inside `stderr.log` in your app folder. |
| **Cannot GET /api/xxx** | Backend not running or reverse proxy misrouted. | Verify `dist/server.cjs` is specified as the startup file and click **Restart App**. |
| **Admin login fails** | Database credentials invalid or unreachable. | Verify `.env` has the correct `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` (or `DATABASE_URL`). |
| **Images not loading** | Local images not synced or R2 Public URL not set. | Go to `/admin` -> **Settings & Storage** -> **Cloudflare R2** and configure your public URL. |
