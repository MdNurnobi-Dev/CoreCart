# Contributing Guidelines (CONTRIBUTING.md)

Thank you for your interest in contributing to the **TechStore E-Commerce Platform**!

---

## 🛠️ 1. Development Setup

1. **Fork & Clone**:
   ```bash
   git clone https://github.com/<your-username>/techstore-ecommerce.git
   cd techstore-ecommerce
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Environment Setup**:
   ```bash
   cp .env.example .env
   ```
4. **Run Dev Server**:
   ```bash
   npm run dev
   ```

---

## 📐 2. Code Quality & Standards

- **TypeScript Strictness**: Ensure all new files and interfaces have strict type annotations. Avoid using `any`.
- **Admin Panel Compact UI Rule**: When working on pages inside `/admin`, you must respect the compact UI constraints defined in `AGENTS.md` (no large fonts >16px, no oversized padding >p-4, fixed layout).
- **Icons**: Use only `lucide-react` icons.
- **Styling**: Use Tailwind CSS utility classes. Avoid inline style objects or raw CSS files.

---

## 🧪 3. Verification Before Submitting PR

Always run the linter and production build before submitting a Pull Request:

```bash
# Type check and lint
npm run lint

# Production build check
npm run build
```

---

## 🚀 4. Pull Request Process

1. Create a descriptive feature branch: `git checkout -b feature/my-cool-feature`
2. Commit using [Conventional Commits](./VERSIONING.md): `git commit -m "feat(cart): add bulk quantity selector"`
3. Push to your fork and submit a PR against the `develop` branch.
4. Ensure your PR description explains what changes were made and links any relevant issues.
