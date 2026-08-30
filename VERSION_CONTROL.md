# Version Control & Git Strategy (VERSION_CONTROL.md)

This project strictly adheres to **Semantic Versioning 2.0.0 (SemVer)** and follows structured Git branching workflows.

---

## 📌 1. Semantic Versioning Specification (`MAJOR.MINOR.PATCH`)

Version numbers are formatted as `X.Y.Z`:

- **`MAJOR` (X)**: Incremented when making incompatible API or database breaking changes, or fundamental architecture overhauls.
- **`MINOR` (Y)**: Incremented when adding new functionality in a backwards-compatible manner (e.g., adding predictive search, new payment gateway, new admin tools).
- **`PATCH` (Z)**: Incremented when applying backwards-compatible bug fixes, UI styling refinements, or security patches.

```text
  v1 . 3 . 0
  │   │   └── Patch: Bug fixes, micro refactoring
  │   └────── Minor: New features & non-breaking capabilities
  └────────── Major: Breaking architectural or schema changes
```

---

## 🌿 2. Git Branching Strategy

We follow a **Trunk-Based / Git Flow hybrid model**:

### Main Branches
- **`main`**: Production-ready codebase. Every commit in `main` is deployable to production.
- **`develop`**: Primary integration branch for upcoming releases.

### Supporting Branches
- **Feature Branches (`feature/<feature-name>`)**:
  - Branched from: `develop`
  - Merged into: `develop`
  - Example: `feature/seo-slug-urls`, `feature/predictive-search`
- **Bugfix Branches (`fix/<issue-name>`)**:
  - Branched from: `develop`
  - Merged into: `develop`
  - Example: `fix/grid-spacing-mismatch`
- **Hotfix Branches (`hotfix/<version>`)**:
  - Branched from: `main`
  - Merged into: `main` AND `develop`
  - Example: `hotfix/v1.3.1-payment-timeout`
- **Release Branches (`release/<version>`)**:
  - Branched from: `develop`
  - Merged into: `main` (tagged) and `develop`
  - Example: `release/v1.3.0`

---

## 🏷️ 3. Release & Tagging Process

When cutting a new release:

1. **Update Versions**:
   - Update `"version"` in `package.json`.
   - Update `CHANGELOG.md` with the new version section and release date.
2. **Execute Validation Suite**:
   ```bash
   npm run lint
   npm run build
   ```
3. **Commit & Tag**:
   ```bash
   git commit -am "chore(release): bump version to v1.3.0"
   git tag -a v1.3.0 -m "Release version 1.3.0: 100% SEO Friendly Slugs and Forensic Audit"
   git push origin main --tags
   ```

---

## 📝 4. Conventional Commit Messages

Commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```text
<type>(<optional scope>): <description>

[optional body]
[optional footer(s)]
```

### Allowed Types:
- `feat`: A new feature for the end user or admin.
- `fix`: A bug fix.
- `docs`: Documentation only changes.
- `style`: Changes that do not affect code logic (formatting, whitespace).
- `refactor`: Code change that neither fixes a bug nor adds a feature.
- `perf`: Code change that improves performance.
- `test`: Adding missing tests or correcting existing tests.
- `chore`: Maintenance tasks, dependencies updates, build scripts.
