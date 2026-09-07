# 🗄️ Database Configurations & Architecture Guide

**CoreCart** features a **Unified Database Engine Abstraction Layer** (`src/server/db.ts`) that automatically adapts to both **PostgreSQL** and **SQLite / Turso**. 

You can switch between cloud providers or local databases simply by changing **environment variables** in `.env` without modifying a single line of application code.

---

## 📊 Quick Engine Comparison

| Database Option | Type | Hosting / Cost | Setup Effort | Recommended For |
| :--- | :--- | :--- | :--- | :--- |
| **1. Turso Cloud SQLite** *(Active)* | Serverless SQLite | Cloud / **Free Forever tier** (500 DBs, 9GB storage, 1B reads/mo) | ⭐ Easiest | **Production (Recommended)** |
| **2. Neon Serverless Postgres** | PostgreSQL 16 | Cloud / **Free tier** (0.5GB compute, 10GB storage) | ⭐ Easy | PostgreSQL teams & cloud scalability |
| **3. Supabase / Render Postgres** | PostgreSQL 15/16 | Cloud / Free tier available | ⭐ Easy | Full Postgres ecosystem |
| **4. Local / cPanel PostgreSQL** | PostgreSQL | Internal cPanel or VPS Server | ⭐⭐ Moderate | Single-server all-in-one setup |
| **5. Local File-based SQLite** | Embedded File | Internal VPS/cPanel File (`./data.db`) | ⭐ Easiest | Staging, offline testing, low-traffic sites |

---

## ⚙️ Option 1: Turso Cloud SQLite (Default & Recommended)

Turso is a lightning-fast distributed SQLite database built on libSQL. It provides sub-millisecond query latency and a generous free tier.

### 1. How to get Turso Credentials (Free)
1. Go to [https://turso.tech](https://turso.tech) and sign up (Free).
2. Install the Turso CLI or create a database in the Web Dashboard:
   ```bash
   turso db create corecart-db --location sin
   ```
3. Get the database URL and create an auth token:
   ```bash
   turso db show corecart-db --url
   # Example output: libsql://corecart-db-youruser.turso.io

   turso db tokens create corecart-db
   # Example output: eyJhbGciOiJFZERT...
   ```

### 2. `.env` Configuration:
```env
DATABASE_TYPE="turso"
TURSO_DATABASE_URL="libsql://techshop-rajboss89130.aws-ap-south-1.turso.io"
TURSO_AUTH_TOKEN="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9..."
```

---

## ⚙️ Option 2: Neon Serverless PostgreSQL

Neon is a modern serverless PostgreSQL database with autoscaling and instant branching.

### 1. How to get Neon Credentials (Free)
1. Go to [https://neon.tech](https://neon.tech) and create a free project.
2. In your Neon dashboard, copy the **Connection string** (Pooled or Direct).

### 2. `.env` Configuration:
```env
DATABASE_TYPE="postgres"
DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-bitter-sun-ayntsxe4-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

---

## ⚙️ Option 3: Supabase / Render / Railway PostgreSQL

You can connect to any cloud-hosted PostgreSQL instance by providing standard connection strings.

### `.env` Configuration:
```env
DATABASE_TYPE="postgres"
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.xxxx.supabase.co:5432/postgres?sslmode=require"
```

---

## ⚙️ Option 4: Local / cPanel PostgreSQL Database

If you want to host PostgreSQL directly on your cPanel or VPS server:

### In cPanel:
1. In cPanel, open **PostgreSQL Database Wizard**.
2. Create a database name: `cpaneluser_corecart`.
3. Create a database user and password.
4. Grant all privileges to the user.

### In VPS (Ubuntu PostgreSQL):
```bash
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres psql -c "CREATE DATABASE corecart;"
sudo -u postgres psql -c "CREATE USER techuser WITH PASSWORD 'StrongPassword#123';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE corecart TO techuser;"
```

### `.env` Configuration:
```env
DATABASE_TYPE="postgres"
DATABASE_URL="postgresql://techuser:StrongPassword#123@localhost:5432/corecart"
```

---

## ⚙️ Option 5: Local File-Based SQLite (`file:./data.db`)

If you want an embedded zero-configuration database that writes directly to a file on your server:

### `.env` Configuration:
```env
DATABASE_TYPE="sqlite"
TURSO_DATABASE_URL="file:./data.db"
TURSO_AUTH_TOKEN=""
```

*(Note: The server will automatically create `data.db` in the project root on first start)*

---

## 🔄 Automatic Schema Migration & Initial Seeding

When the application boots for the first time on any database engine:

1. **Table Creation:** Automatically creates all required tables if they do not exist:
   - `users`
   - `categories`
   - `products`
   - `orders`
   - `order_items`
   - `settings`
   - `custom_pages`
   - `image_providers`
   - `cloud_backup_settings`
   - `support_chats` & `support_messages`

2. **Default Administrator Seeding:**
   - Creates the default super-admin user:
     - **Email:** `victorsteele428@gmail.com`
     - **Password:** `RajPass##321` (encrypted via bcrypt)
     - **Role:** `admin`
