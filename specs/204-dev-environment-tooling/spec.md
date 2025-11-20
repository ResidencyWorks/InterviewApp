# Feature Specification: Dev Environment & Tooling

**Feature Branch**: `004-dev-tooling`
**Created**: 2025-10-20
**Status**: Draft

---

## 🧑‍🎓 User Story

**Story**: As a developer, I want a reproducible local dev environment with linting, pre-commit hooks, and consistent tooling to ensure code hygiene.

**Acceptance Criteria:**
- Devcontainer with pnpm, biome, node, and required VS Code extensions:
  - ms-vscode.vscode-typescript-next
  - bradlc.vscode-tailwindcss
  - ms-vscode.vscode-json
  - esbenp.prettier-vscode (disabled - using Biome)
  - ms-vscode.vscode-eslint (disabled - using Biome)
- Biome replaces ESLint/Prettier
- Lefthook setup with:
  - pre-commit (lint + format)
  - pre-push (typecheck + test)
- .env.example present with keys
- Scripts defined in `package.json` for development workflow:
  - `dev`: Start development server
  - `build`: Build for production
  - `test`: Run unit tests
  - `test:e2e`: Run E2E tests
  - `lint`: Lint code with Biome
  - `format`: Format code with Biome
  - `typecheck`: Run TypeScript type checking
  - `verify-setup`: Verify development environment setup

---

## ✅ Functional Requirements

- **FR-001**: `.devcontainer/` includes setup for VS Code + CLI
  - Validation: `code .` opens project in VS Code with devcontainer prompt
- **FR-002**: `biome.json` with TypeScript + markdown rules
  - Validation: `pnpm biome check` runs without errors
- **FR-003**: `lefthook.yml` with hook stages
  - Validation: `lefthook run pre-commit` executes successfully
- **FR-004**: `pnpm-lock.yaml` and workspace setup
  - Validation: `pnpm install` completes without errors
- **FR-005**: `README.md` with local + Vercel setup guide
  - Validation: README contains setup instructions and works on fresh clone

---

## 🧪 Test Artifacts Required

- Run `lefthook run pre-commit` and `pre-push`
- Lint failure exits non-zero
- Devcontainer runs `pnpm dev` successfully
