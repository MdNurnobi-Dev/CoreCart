# ☁️ Cloudflare R2 Object Storage & Backup Guide

**Cloudflare R2** provides S3-compatible, ultra-fast object storage with **zero egress bandwidth fees**. TechStore uses Cloudflare R2 for two main purposes:

1. **High-Speed Product Media Storage:** All uploaded product images, banners, and logos stream directly from Cloudflare's global edge network.
2. **Automated Cloud Database Backups:** Automatic daily/weekly snapshots of all database tables uploaded directly into your private R2 bucket.

---

## 🛠️ Step 1: Create a Cloudflare R2 Bucket

1. Log into your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. In the left sidebar, navigate to **R2 Object Storage**.
3. Click **Create bucket**.
4. Enter a Bucket Name (e.g., `techstore-media`) and choose location **Automatic**.
5. Click **Create bucket**.

---

## 🔑 Step 2: Generate R2 API Credentials

1. In the R2 Dashboard, click **Manage R2 API Tokens** (on the right sidebar).
2. Click **Create API token**.
3. Set Permissions to **Object Read & Write**.
4. Specify the bucket or select **All buckets**.
5. Click **Create API Token**.
6. Cloudflare will display:
   - **Account ID** (found on the main R2 page or token page)
   - **Access Key ID**
   - **Secret Access Key**
   - **Endpoint URL** (e.g., `https://<account_id>.r2.cloudflarestorage.com`)

---

## 🌐 Step 3: Enable Public Access / Custom Domain

To allow users to view product images in their browsers:

1. Open your bucket in Cloudflare -> Go to the **Settings** tab.
2. Under **Public Access**, you have two options:
   - **Option A (Free R2.dev domain):** Click **Allow Access** under *R2.dev subdomain*. You will receive a URL like `https://pub-xxxxxxxxxxxxxx.r2.dev`.
   - **Option B (Custom Domain):** Click **Connect Domain** and bind a domain like `media.yourdomain.com`.

---

## ⚙️ Step 4: Configure CORS (Cross-Origin Resource Sharing)

In your bucket **Settings** -> **CORS Policy**, add this JSON:

```json
[
  {
    "AllowedOrigins": [
      "*"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [],
    "MaxAgeSeconds": 3000
  }
]
```

---

## 📝 Step 5: Connecting R2 to TechStore

You can configure Cloudflare R2 in **two ways**:

### Method 1: Via Environment Variables (`.env`)
Add these keys to your `.env` file:

```env
R2_ACCOUNT_ID="your_cloudflare_account_id"
R2_ACCESS_KEY_ID="your_r2_access_key_id"
R2_SECRET_ACCESS_KEY="your_r2_secret_access_key"
R2_BUCKET_NAME="techstore-media"
R2_PUBLIC_URL="https://pub-xxxxxxxxxxxxxx.r2.dev"
```

### Method 2: Via Admin Dashboard UI
1. Log in to the Admin Panel (`/admin` -> **Settings & Storage**).
2. Open the **Cloudflare R2** configuration card.
3. Enter your Account ID, Bucket Name, Access Key, Secret Key, and Public URL.
4. Click **Test R2 Connection** to verify live connectivity and latency.
5. Click **Save Storage Settings**.

---

## 💾 Automatic Backup & Migration Tools

From the Admin Dashboard:
- **Instant Cloud Backup:** Click **"Backup to Cloud R2"** to take an on-demand full database snapshot.
- **One-Click Restore:** Browse previous backups in your R2 bucket and restore with a single click.
- **Auto-Sync:** Migrate existing local media to Cloudflare R2 with live progress tracking.
