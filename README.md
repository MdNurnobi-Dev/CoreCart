# TechStore E-Commerce & Multi-Channel Live Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3+-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2+-646CFF.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC.svg)](https://tailwindcss.com/)
[![License: Dual/Fair-Source](https://img.shields.io/badge/License-Dual%20(Dev%20Free%20%2F%20Commercial%20Paid)-orange.svg)](./LICENSE.md)

A modern, full-stack, enterprise-grade e-commerce application engineered with high-performance React 18, Vite, Express backend, predictive search, dynamic invoice generation, automated payment verification, Cloudflare R2 image storage, and bi-directional real-time customer support integrated with Firebase & Telegram Bots.

---

## 🌟 Key Highlights & Features

### 🛒 High-Conversion Storefront
- **Predictive Search & Quick-View**: As-you-type fuzzy & keyword search with real-time stock indicators, category filtering shortcuts, and split-view preview pane.
- **Symmetric 6-Column Responsive Grid**: Optimized product display with lazy-loaded images, fallback error handlers, and zero layout shifts.
- **1-Click Quick Order Modal**: Fast checkout flow with instant address parsing, mobile banking (bKash, Nagad, Rocket, COD), and live total calculation.
- **Dynamic Wishlist & Cart System**: Synchronized across local sessions with real-time badges and responsive slide-out carts.
- **Order Tracking**: End-to-end status timeline with courier tracking and real-time updates.

### 🛡️ Enterprise Admin Control Panel
- **Compact UI Architecture**: Data-dense, high-efficiency dashboard respecting fixed viewport constraints and sub-14px micro-typography.
- **Multi-Storage Image Engine**: Seamless switching and diagnostic validation between Local Storage and Cloudflare R2 (S3-compatible API).
- **Payment Verification Engine**: Instant review for manual mobile banking receipts (TrxID) and automated gateway processing.
- **Dynamic CMS & Page Builder**: Create custom rich-text content pages (`/page/:slug`) directly from the admin dashboard.
- **Multi-Channel Live Chat**: Integrated customer support widget routing chat messages in real time between the browser and Telegram bot administrators.

### 🔒 Resilience & Fault-Tolerance
- **Global & Nested React Error Boundaries**: Isolates runtime exceptions with user-friendly recovery flows and full stack-trace diagnostics.
- **SQLite Database Layer**: Powered by `better-sqlite3` with automated schema migrations, robust indexes, and transaction safety.

---

## 🏗️ Architecture & Tech Stack

```text
├── src/
│   ├── components/       # UI building blocks (Navbar, Search, Cart, Footer, ErrorBoundary)
│   ├── context/          # React Contexts (Auth, Cart, Products, Settings, Favorites)
│   ├── pages/            # Public storefront & admin management views
│   ├── services/         # Storage (R2, Local), Chat, Telegram, and Payment providers
│   ├── utils/            # Diagnostic test suites, formatters, and validation helpers
│   └── lib/              # API fetch clients and shared helpers
├── server.ts             # Express REST backend + Vite middleware + API endpoints
├── docs/                 # Detailed VPS, cPanel, Cloudflare R2, and DB deployment guides
```

- **Frontend**: React 18, TypeScript, Tailwind CSS v4, Lucide Icons, React Router v6, Canvas Confetti.
- **Backend / APIs**: Node.js, Express, `better-sqlite3`, `@aws-sdk/client-s3` (Cloudflare R2), Multer.
- **Live Communication**: WebSocket / Firebase Realtime & Telegram Bot Webhooks.

---

## 🚀 Quick Start (Development)

### 1. Prerequisites
- Node.js 18.x or 20.x LTS
- npm or bun

### 2. Installation
```bash
# Clone repository
git clone https://github.com/your-username/techstore-ecommerce.git
cd techstore-ecommerce

# Install dependencies
npm install
```

### 3. Environment Configuration
Copy the example environment file and configure your credentials:
```bash
cp .env.example .env
```

Key environment variables:
```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key
CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET_NAME=
CLOUDFLARE_R2_PUBLIC_URL=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

### 4. Run Development Server
```bash
npm run dev
```
The application will boot at `http://localhost:3000`.

---

## 📦 Production Deployment

### Building the Project
```bash
npm run build
```
This compiles client static assets to `dist/` and bundles the backend server into a production-optimized `dist/server.cjs`.

### Starting Production Server
```bash
npm start
```

For complete hosting guides, explore our dedicated documentation in `/docs`:
- [VPS & Ubuntu Deployment Guide](./docs/vps-deployment-guide.md)
- [cPanel & Shared Hosting Guide](./docs/cpanel-deployment-guide.md)
- [Cloudflare R2 Image Setup](./docs/cloudflare-r2-setup.md)
- [Database Configurations & Backup](./docs/database-configurations.md)

---

## 📜 Documentation Index

| Document | Purpose |
| :--- | :--- |
| [`AGENTS.md`](./AGENTS.md) | Coding standards, AI agent boundaries, and Admin Panel design locks |
| [`CHANGELOG.md`](./CHANGELOG.md) | Release history, bug fixes, and feature milestone tracking |
| [`VERSIONING.md`](./VERSIONING.md) | Semantic versioning specification (SemVer) and release workflow |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | Developer guidelines, PR conventions, and style rules |
| [`SECURITY.md`](./SECURITY.md) | Vulnerability disclosure policy and security best practices |
| [`LICENSE.md`](./LICENSE.md) | Dual Licensing Model (Free for Devs / Paid for Commercial Business) |

---

## ⚖️ License Summary

This project operates under a **Dual / Fair-Source Commercial License**:
- **Free for Non-Commercial & Developer Use**: Free for personal projects, open-source learning, educational experimentation, and non-profit portfolio showcases.
- **Commercial License Required**: Any commercial usage, revenue-generating business deployment, client resale, or SaaS distribution requires a valid commercial license.

See the complete terms in [LICENSE.md](./LICENSE.md).

---

## About Vib Tools (Author)

This project is developed and maintained by **Vib Tools** and its associated contributors (including Md Nurnobi - @victorsteele).

**Vib Tools** builds practical desktop applications, self-hosted software, automation tooling, developer utilities, reusable frameworks, and open-source projects for real workflows. 

- **Website:** [https://vib.tools/](https://vib.tools/)
- **GitHub:** [@vibtools](https://github.com/vibtools)
- **Support Email:** support@vib.tools
- **General Contact:** hello@vib.tools
- **Phone / WhatsApp:** +880 1795-470603
- **Head Office:** 5660 Kochakata, Nageswari, Kurigram, Rangpur, Bangladesh (GMT+6)

*Practical software for real workflows.* For more details, see the [AUTHOR.md](AUTHOR.md) file.
