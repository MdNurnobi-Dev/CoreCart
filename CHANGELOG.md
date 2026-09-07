# Changelog

All notable changes to the **CoreCart E-Commerce Platform** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Automated webhook triggers for SSLCommerz and Shurjopay live callbacks.
- Multi-currency dynamic exchange rate provider.
- Advanced export formats for sales analytics (Excel, CSV, PDF).

---

## [1.3.0] - 2026-08-29

### Added
- **Predictive Search Bar**: Integrated header search with real-time substring highlighting, category shortcut pills, recent searches cache, and split-pane quick-view drawer.
- **React Error Boundary Component**: Added root and nested layout error containment with detailed stack-trace viewer and copy-to-clipboard diagnostics.
- **Modern Lightweight Footer**: Replaced heavy footers with mobile-friendly collapsible accordion menus, slim trust badges, and security certification pills.
- **Documentation Suite**: Added root `README.md`, `AGENTS.md`, `CHANGELOG.md`, `VERSIONING.md`, `LICENSE.md`, `SECURITY.md`, and `CONTRIBUTING.md`.

### Changed
- **Home Page Product Grid Symmetry**: Re-aligned all showcase sections (Trending, Best Sellers, Featured) to 6-column desktop rows with multiples of 6 pagination.
- **TypeScript Type Safety**: Resolved strict typing issues across manual payment records, cart item categories, and R2 diagnostics.

### Fixed
- Fixed whitespace gap caused by 4-product slice inside 6-column grid containers on desktop displays.
- Fixed unhandled React rendering crash risk across dynamic admin views.

---

## [1.2.0] - 2026-08-15

### Added
- **Cloudflare R2 Storage Provider**: Added multi-provider storage switcher with real-time credential diagnostic health checks.
- **Bi-Directional Telegram Bot Integration**: Real-time push notifications for new incoming orders and customer live-chat sync.
- **Dynamic Invoice Designer**: Configurable printable invoice templates with shop logos, watermarks, and QR code tracking.

### Changed
- Refactored admin panel layout to a fixed-viewport container (`fixed inset-0`) with independent scrolling content.

---

## [1.1.0] - 2026-07-28

### Added
- **1-Click Quick Order Modal**: Fast checkout overlay with instant phone verification and delivery zone rate calculation.
- **Dynamic Wishlist & Favorites System**: Added persistent heart count badges and dedicated `/favorites` view.
- **Custom Dynamic Page Builder**: Admin module to author static pages (`/page/:slug`) such as Privacy Policy, Terms, and About Us.

---

## [1.0.0] - 2026-06-10

### Added
- Initial release of the CoreCart e-commerce application.
- Product catalog, category management, and inventory tracking.
- Shopping cart, checkout flow with COD, and order tracking timeline.
- Role-based authentication (Admin vs. Customer).
- SQLite storage with `better-sqlite3` and Express REST API backend.
