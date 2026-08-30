# Cloudflare Pages - 100% Serverless Deployment Guide

This guide explains how to deploy your project completely **Serverless** on Cloudflare Pages using Cloudflare Functions, Turso (Database), and Cloudflare R2 (Storage)—without needing any VPS or Cpanel.

## ⚠️ Important Serverless Limitations
Before deploying, you must understand how Cloudflare V8 Isolates (Workers/Functions) differ from a traditional VPS Node.js server:
1. **No Background Processes:** Cloudflare Functions only run when there is an active HTTP request. Features relying on continuous background tasks (like `setInterval` for automatic sitemaps or `startTelegramPoller()` for Telegram live chat) **will not run continuously**. (To fix Telegram, you would eventually need to switch from polling to Telegram Webhooks).
2. **File Uploads (Multer):** The project uses `multer.memoryStorage()`, which works with the `nodejs_compat` flag in Cloudflare, allowing file uploads directly to R2.
3. **Execution Limits:** APIs must respond quickly (typically within 30-50 seconds).

Everything else—Authentication, E-Commerce, Admin Panel, Database Queries (Turso), and File Storage (R2)—will work flawlessly and blazingly fast at the edge.

---

## Phase 1: Preparation (Third-Party Services)

### 1. Turso Database (Cloud SQLite)
1. Go to [Turso](https://turso.tech/) and create a database.
2. Get your Database URL (e.g., `libsql://your-db-name.turso.io`).
3. Generate an Auth Token.
4. *Note: Ensure your database is synced/migrated before deploying.*

### 2. Cloudflare R2 Storage (Image/Media Hosting)
1. Go to Cloudflare Dashboard -> **R2 Object Storage**.
2. Create a bucket (e.g., `my-shop-assets`).
3. Enable **Public Access** (either a custom domain or `.r2.dev` URL).
4. Go to R2 Settings -> **Manage R2 API Tokens** and create a token with **Object Read & Write** permissions.
5. Save the `Access Key ID`, `Secret Access Key`, and your Cloudflare `Account ID`.

---

## Phase 2: Cloudflare Pages Deployment

1. Push your updated code (including the `.github`, `functions`, and `wrangler.toml` files) to a GitHub repository.
2. Go to the Cloudflare Dashboard -> **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**.
3. Select your GitHub repository.
4. Configure the build settings exactly as follows:
   - **Framework preset:** `None`
   - **Build command:** `npm run build:cf`
   - **Build output directory:** `dist`

### 🛑 CRITICAL STEP: Compatibility Flags
Cloudflare Pages needs Node.js compatibility to run Express.
1. Do not deploy yet (or if it auto-deploys, let it fail or cancel it).
2. Go to your Pages Project -> **Settings** -> **Functions**.
3. Scroll down to **Compatibility flags**.
4. Add the flag: `nodejs_compat` (for both Production and Preview).

---

## Phase 3: Environment Variables (.env Setup)

To run without a VPS, you MUST set the following Environment Variables in the Cloudflare Pages Dashboard. 
Go to **Settings** -> **Environment Variables** and add these for **Production** (and Preview if needed).

| Variable Name | Example Value | Description |
|---|---|---|
| `NODE_VERSION` | `20` | Forces Cloudflare build system to use Node 20. |
| `TURSO_DATABASE_URL` | `libsql://your-db.turso.io` | Your Turso DB connection string. |
| `TURSO_AUTH_TOKEN` | `eyJh...` | Your Turso authentication token. |
| `JWT_SECRET` | `your-super-secret-key` | Secret key for Admin/User login tokens. |
| `GEMINI_API_KEY` | `AIza...` | (Optional) If you use Google AI features. |

*(Do **NOT** set `CF_API_TARGET`! If you set `CF_API_TARGET`, Cloudflare will try to proxy to a VPS instead of running serverless).*

---

## Phase 4: Configure the Admin Panel (R2 Settings)
Once the site is live:
1. Log in to your Admin Panel.
2. Go to **Settings** -> **Cloud Backup & Storage** (or the respective R2 settings page).
3. Enter your R2 details:
   - **Account ID:** Your Cloudflare Account ID
   - **Access Key:** Your R2 Token Access Key
   - **Secret Key:** Your R2 Token Secret Key
   - **Bucket Name:** `my-shop-assets`
   - **Public URL:** `https://your-public-r2-url.com`
4. Set Primary Storage to `R2`.

---

## Phase 5: Custom Domain
1. Go to your Cloudflare Pages project.
2. Click the **Custom Domains** tab.
3. Click **Set up a custom domain** and follow the prompts to link your domain (e.g., `www.mywebsite.com`). Cloudflare will automatically handle the SSL certificate and DNS routing.

---

## Testing Your Serverless App
Once deployed:
1. Visit your frontend URL. Everything should load instantly.
2. Go to `/admin` and log in (testing Database connectivity).
3. Upload a product image (testing R2 Storage integration via `serverless-http` and `multer` memory storage).
4. Browse the shop and add items to cart.

Congratulations! Your app is now running 100% serverless at the edge!
