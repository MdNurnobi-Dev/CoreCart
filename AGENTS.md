# Agent & Developer System Directives (AGENTS.md)

This file defines the strict design scope, architecture patterns, and operational boundaries for AI coding assistants, agents, and human contributors working in this codebase.

---

## 🔒 1. Admin Panel Design Scope Lock (STRICT ENFORCEMENT)

All pages located in `/admin` or named `Admin*.tsx` **MUST** strictly adhere to the **Small Size UI Compact Design** philosophy:

1. **Micro-Typography & Density**:
   - Headings must not exceed `text-[16px]` or `text-[14px]`.
   - Data values and primary statistics must be capped at `text-[18px]`.
   - Never use oversized hero headings (`text-2xl`, `text-3xl`, `text-4xl`).
2. **Compact Spacing & Padding**:
   - Limit container padding to `p-3` or `p-4`.
   - Do NOT use bloated spacing such as `p-6`, `p-8`, or `gap-8`.
   - Use `gap-2` to `gap-4` for tight, data-dense layouts.
3. **Fixed Viewport Layout Constraint**:
   - The Admin Panel uses a fixed-to-viewport container (`fixed inset-0`).
   - The navigation sidebar **MUST** remain fixed and not scroll with the page.
   - The main content area handles its own independent scrolling (`overflow-y-auto`).
   - **DO NOT** change `min-h-screen` back on the layout container if it causes the sidebar to scroll.

---

## 🛍️ 2. Storefront UI & UX Standards

1. **Symmetric Grid Layouts**:
   - Storefront product lists must maintain 6-column symmetry on desktop screens (`grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6`).
   - Slices and paginated counts must be multiples of 6 (e.g., 6, 12, 18) to avoid unsightly empty columns.
2. **Resilience & Image Fallbacks**:
   - All product images must utilize `<LazyImage />` with `DEFAULT_PRODUCT_IMAGE` fallbacks to eliminate broken image icons.
3. **No Unsolicited Scope Additions**:
   - Respect user instructions strictly. Build exactly what is requested with high craftsmanship, without adding unnecessary mock modules or promotional clutter.

---

## ⚙️ 3. Backend & Storage Architecture

1. **Cloudflare R2 & S3 Compatibility**:
   - Cloudflare R2 configurations are managed via `/src/services/r2Storage.ts` and validated via `/src/utils/r2Validation.ts`.
   - Diagnostic endpoints must return structured JSON diagnostics with individual status flags (`credentialsPresent`, `bucketReachable`, `uploadPermitted`, `corsVerified`).
2. **Database Integrity**:
   - SQLite tables must use foreign keys and structured migrations.
   - Any new payment gateway, order status, or setting field must provide non-destructive schema initialization in `server.ts`.

---

## 🛡️ 4. Fault Isolation & Error Boundaries

1. **Component Protection**:
   - Public and Admin outlet routes are wrapped with `<ErrorBoundary />` to catch unexpected rendering exceptions.
   - Any new complex interactive widget (such as chart visualizers, payment modals, or custom layout parsers) should be wrapped with a nested `<ErrorBoundary isNested={true} />`.
