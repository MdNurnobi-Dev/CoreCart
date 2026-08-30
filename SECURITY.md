# Security Policy & Vulnerability Disclosure (SECURITY.md)

We take the security and integrity of the **TechStore E-Commerce Platform** seriously.

---

## 🔒 1. Supported Versions

Only the latest active minor release receives active security patches.

| Version | Supported |
| :--- | :--- |
| `1.3.x` | ✅ Yes (Active Support) |
| `1.2.x` | ⚠️ Security Hotfixes Only |
| `< 1.2.0` | ❌ No (Please Upgrade) |

---

## 🚨 2. Reporting a Vulnerability

If you discover a security vulnerability or sensitive bug in this platform, **please do not disclose it publicly in GitHub Issues or forum discussions.**

### How to Report:
1. Send an encrypted or confidential email to: `security@your-domain.com` or `victorsteele428@gmail.com`.
2. Include:
   - Vulnerability type and severity (e.g., SQL Injection, Auth Bypass, XSS, CSRF, Exposure of Credentials).
   - Step-by-step reproduction instructions or a minimal Proof of Concept (PoC).
   - Affected files and components.
   - Any proposed remediation or patch.

### Our Response Timeline:
- **Initial Acknowledgment**: Within 24 hours.
- **Triage & Validation**: Within 48 hours.
- **Patch Release & Security Advisory**: Typically within 3 to 7 business days depending on severity.

---

## 🛡️ 3. Built-In Security Practices

- **API Secret Protection**: No API keys or credentials (JWT Secret, Telegram Token, S3 Secret Key) are ever exposed to client bundles.
- **SQL Parameterization**: All database queries executed via `better-sqlite3` use parameterized statements to eliminate SQL injection vectors.
- **Input Sanitization**: User-submitted reviews, chat messages, and custom page HTML are sanitized to prevent stored Cross-Site Scripting (XSS).
- **Authentication**: Passwords are encrypted using bcrypt hashing algorithms and authenticated via secure JWT tokens.
