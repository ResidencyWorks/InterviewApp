# Implementation Plan: Dev Environment & Tooling

**Branch**: `004-dev-environment-tooling` | **Date**: 2025-01-27 | **Spec**: [link]
**Input**: Feature specification from `/specs/004-dev-environment-tooling/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Set up comprehensive developer environment and CI tooling with .devcontainer configuration, pnpm package management, Node.js LTS, Biome for linting/formatting, and VS Code extensions. Implement lefthook git hooks for pre-commit (lint, format, typecheck) and pre-push (full test suite). Enforce conventional commit formatting and provide complete .env.example with all required keys for Supabase, Stripe, PostHog, and Sentry. Generate testable dev setup that works on fresh clone with comprehensive README documentation.

## Technical Context

**Language/Version**: TypeScript 5.0+ with strict mode enabled
**Primary Dependencies**: Node.js LTS, pnpm, Biome, lefthook, Vitest, Playwright, VS Code extensions
**Storage**: File system for configuration files, .devcontainer for environment setup
**Testing**: Vitest for unit/integration tests, Playwright for E2E tests
**Target Platform**: Development environment (VS Code + devcontainer)
**Project Type**: Development tooling and CI/CD setup
**Performance Goals**: Fresh clone setup ≤5 minutes, pre-commit hooks ≤30s, pre-push hooks ≤2 minutes
**Constraints**: Must work on fresh clone, all tools must be containerized, conventional commits enforced
**Scale/Scope**: M0 MVP with complete dev environment, 4 git hooks, 1 devcontainer, comprehensive documentation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Code Quality Gates:**

- [x] TypeScript strict mode enabled
- [x] Biome formatting and linting configured
- [x] lefthook hooks configured for pre-commit/pre-push
- [x] JSDoc comments planned for all exported functions

**Architecture Gates:**

- [x] Devcontainer configuration follows VS Code best practices
- [x] Git hooks properly configured for code quality enforcement
- [x] Package management follows pnpm workspace standards

**Testing Gates:**

- [x] Test-first approach planned
- [x] Vitest configuration planned
- [x] 80% coverage target set
- [x] Unit and integration test strategy defined

**Tooling Gates:**

- [x] pnpm as package manager confirmed
- [x] Devcontainer with Node.js LTS, Biome, lefthook planned
- [x] No ESLint/Prettier (Biome only)

**Performance Gates:**

- [x] Fresh clone setup performance targets defined (≤5 minutes)
- [x] Pre-commit hook performance targets defined (≤30s)
- [x] Pre-push hook performance targets defined (≤2 minutes)

**MCP Integration Gates:**

- [x] Context7 for specs/plans identified
- [x] Supabase for auth/storage/DB planned
- [x] Vercel for deployment planned
- [x] PostHog for analytics planned
- [x] Sentry for error tracking planned

## Project Structure

### Documentation (this feature)

```
specs/004-dev-environment-tooling/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
# Dev Environment & Tooling Configuration
.devcontainer/
├── devcontainer.json           # VS Code devcontainer configuration
├── Dockerfile                  # Custom Docker image with all tools
├── docker-compose.yml          # Multi-service development setup
└── scripts/
    ├── setup-dev.sh           # Initial development setup script
    ├── install-deps.sh        # Dependency installation script
    └── verify-setup.sh        # Setup verification script

# Configuration files
.vscode/
├── settings.json              # VS Code workspace settings
├── extensions.json            # Required VS Code extensions
└── launch.json                # Debug configurations

# Git hooks and tooling
lefthook.yml                   # Git hooks configuration
biome.json                     # Biome linting and formatting config
vitest.config.ts              # Vitest test configuration
playwright.config.ts           # Playwright E2E test configuration

# Package management
package.json                   # Project dependencies and scripts
pnpm-lock.yaml                # pnpm lock file
pnpm-workspace.yaml           # pnpm workspace configuration

# Environment and secrets
.env.example                   # Complete environment template
.env.local.example            # Local development environment template
.env.test.example             # Test environment template

# Documentation
README.md                      # Comprehensive setup documentation
CONTRIBUTING.md               # Development contribution guidelines
DEVELOPMENT.md                # Development environment guide
HOOKS.md                      # Git hooks documentation

# CI/CD configuration
.github/
├── workflows/
│   ├── ci.yml                # Continuous integration workflow
│   ├── test.yml              # Test execution workflow
│   └── deploy.yml             # Deployment workflow
└── dependabot.yml            # Dependency update automation

# Scripts and utilities
scripts/
├── dev/
│   ├── setup.sh              # Development environment setup
│   ├── test.sh               # Test execution script
│   ├── lint.sh               # Linting script
│   └── format.sh             # Formatting script
├── ci/
│   ├── install.sh            # CI dependency installation
│   ├── test.sh               # CI test execution
│   └── build.sh              # CI build script
└── hooks/
    ├── pre-commit.sh         # Pre-commit hook script
    ├── pre-push.sh           # Pre-push hook script
    └── commit-msg.sh         # Commit message validation script
```

**Structure Decision**: Comprehensive development environment with containerized setup, automated tooling, and clear documentation. All configuration files are version-controlled and documented for easy onboarding.

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [None currently identified] | [N/A] | [N/A] |
