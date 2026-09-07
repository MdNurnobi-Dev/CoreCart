# 📚 CoreCart Production & Server Deployment Hub

Welcome to the complete deployment, database configuration, and operations documentation for **CoreCart**.

This application is built with a high-performance **React 19 + Vite frontend** and a lightweight **Express + Node.js backend (`server.ts` / `dist/server.cjs`)**. It is architected to be **100% cloud-agnostic**, running on **cPanel Shared Hosting (Node.js Selector)**, **VPS (Ubuntu/Debian, Nginx, PM2)**, **Docker containers**, or serverless platforms.

---

## 🗂️ Documentation Navigation

| Document | Purpose |
| :--- | :--- |
| **[1. cPanel Deployment Guide](./cpanel-deployment-guide.md)** | Step-by-step guide to deploying on cPanel using "Setup Node.js App". |
| **[2. VPS (Ubuntu/Nginx/PM2) Guide](./vps-deployment-guide.md)** | Production-grade deployment with PM2, Nginx Reverse Proxy, and SSL (Certbot). |
| **[3. Database Configurations & Options](./database-configurations.md)** | Detailed comparison and configuration for Turso Cloud, Neon Postgres, Local Postgres, and Local SQLite. |
| **[4. Cloudflare R2 Storage & Backups](./cloudflare-r2-setup.md)** | Setting up Cloudflare R2 for zero-cost media storage and automatic cloud database backups. |
| **[5. Ready-to-Use `.env` Templates](./env-templates/)** | Pre-configured environment templates for every database & server scenario. |

---

## 🚀 Quick Start Summary (30-Second Overview)

### Supported Server Environments
- ✅ **cPanel Shared Hosting** with CloudLinux "Setup Node.js App"
- ✅ **VPS / Dedicated Server** (Ubuntu 20.04/22.04/24.04, Debian, CentOS, AlmaLinux)
- ✅ **Docker & Cloud Run / Container Platforms**

### Supported Database Engines (Zero Code Changes Needed)
1. **Turso Cloud SQLite** *(Default & Recommended)* — Ultra-fast serverless SQLite with free tier.
2. **Neon Serverless PostgreSQL** — Free-tier managed cloud PostgreSQL with SSL.
3. **Supabase / Render / Railway PostgreSQL** — Managed PostgreSQL cloud providers.
4. **Local / cPanel PostgreSQL** — Native cPanel database or localhost PostgreSQL on VPS.
5. **Local File-based SQLite** — Zero configuration embedded database.

---

## 🛠️ Essential Build & Start Commands

```bash
# 1. Install all dependencies
npm install

# 2. Compile React frontend and bundle backend into dist/server.cjs
npm run build

# 3. Start the production server (Binds to PORT defined in .env or 3000)
npm start

# 4. Run during local development with hot reload
npm run dev
```

---

## 🔐 Default Admin Credentials

Upon initial database connection, the system automatically creates the schema and initializes the default super-admin user if not already present:

- **Admin URL:** `https://yourdomain.com/login` (or `/admin`)
- **Admin Email:** `victorsteele428@gmail.com`
- **Admin Password:** `RajPass##321`

*(Password can be updated anytime from the Admin Management panel)*
