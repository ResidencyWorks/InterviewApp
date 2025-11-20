# Quickstart: Dev Environment & Tooling

**Feature**: 004-dev-environment-tooling
**Date**: 2025-01-27
**Purpose**: Get up and running with the development environment quickly

## Overview

The Dev Environment & Tooling provides a complete development setup with VS Code devcontainer, pnpm package management, Biome linting/formatting, lefthook git hooks, and comprehensive testing. It ensures consistent development experience across all team members with automated tooling and quality gates.

## Prerequisites

- Docker Desktop installed and running
- VS Code with Dev Containers extension
- Git installed and configured
- GitHub account with repository access

## Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/your-org/interview-app.git
cd interview-app

# Copy environment template
cp .env.example .env.local

# Edit environment variables
# Add your API keys and configuration
```

### 2. Open in Devcontainer

```bash
# Open in VS Code
code .

# VS Code will prompt to "Reopen in Container"
# Click "Reopen in Container" or use Command Palette:
# Ctrl+Shift+P -> "Dev Containers: Reopen in Container"
```

### 3. Verify Setup

```bash
# Run setup verification
pnpm run verify-setup

# Expected output:
# ✅ Node.js 20.10.0
# ✅ pnpm 8.15.0
# ✅ Biome 1.4.1
# ✅ Lefthook 1.5.0
# ✅ Vitest 1.0.0
# ✅ Playwright 1.40.0
# ✅ All VS Code extensions installed
# ✅ Environment variables configured
```

## Development Workflow

### Daily Development

```bash
# Install dependencies (if needed)
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Lint and format code
pnpm lint
pnpm format

# Type check
pnpm typecheck
```

### Git Workflow

The project uses conventional commits with automated git hooks:

```bash
# Pre-commit hooks (automatic)
# - Lint and format code
# - Type check
# - Run unit tests

# Pre-push hooks (automatic)
# - Run full test suite
# - Run E2E tests
# - Verify commit message format

# Commit message format
git commit -m "feat: add new feature"
git commit -m "fix: resolve bug in authentication"
git commit -m "docs: update README"
```

## Configuration

### Environment Variables

Edit `.env.local` with your configuration:

```bash
# Database (Supabase)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# External Services
OPENAI_API_KEY=your_openai_api_key
POSTHOG_API_KEY=your_posthog_api_key
SENTRY_DSN=your_sentry_dsn
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Redis
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
```

### VS Code Settings

The devcontainer includes pre-configured VS Code settings:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.biome": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "eslint.enable": false,
  "prettier.enable": false
}
```

### Biome Configuration

Biome is configured for strict TypeScript linting and formatting:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.4.1/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedVariables": "error"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  }
}
```

## Available Scripts

### Development Scripts

```bash
# Development
pnpm dev                 # Start development server
pnpm build              # Build for production
pnpm start              # Start production server

# Testing
pnpm test               # Run unit tests
pnpm test:watch         # Run tests in watch mode
pnpm test:coverage      # Run tests with coverage
pnpm test:e2e           # Run E2E tests
pnpm test:e2e:ui        # Run E2E tests with UI

# Code Quality
pnpm lint               # Lint code
pnpm lint:fix           # Lint and fix code
pnpm format             # Format code
pnpm typecheck          # Type check
pnpm typecheck:watch    # Type check in watch mode

# Setup and Verification
pnpm setup              # Setup development environment
pnpm verify-setup       # Verify environment setup
pnpm install-hooks      # Install git hooks
pnpm verify-hooks       # Verify git hooks
```

### Git Hooks

The project uses lefthook for git hook management:

```bash
# Install hooks
pnpm lefthook install

# Run hooks manually
pnpm lefthook run pre-commit
pnpm lefthook run pre-push

# Skip hooks (use with caution)
git commit --no-verify
git push --no-verify
```

## Testing

### Unit and Integration Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test src/lib/auth.test.ts

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch
```

### E2E Tests

```bash
# Run E2E tests
pnpm test:e2e

# Run E2E tests with UI
pnpm test:e2e:ui

# Run specific E2E test
pnpm test:e2e tests/e2e/auth.spec.ts
```

### Test Configuration

Tests are configured with Vitest for unit/integration and Playwright for E2E:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      threshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  }
})
```

## Troubleshooting

### Common Issues

1. **Devcontainer fails to start**

   ```bash
   # Check Docker is running
   docker --version

   # Rebuild devcontainer
   # VS Code Command Palette -> "Dev Containers: Rebuild Container"
   ```

2. **Git hooks not working**

   ```bash
   # Reinstall hooks
   pnpm lefthook install

   # Check hook configuration
   cat lefthook.yml
   ```

3. **Tests failing**

   ```bash
   # Check test configuration
   pnpm test --reporter=verbose

   # Run specific test to debug
   pnpm test src/lib/auth.test.ts --reporter=verbose
   ```

4. **Environment variables not loading**

   ```bash
   # Check .env.local exists
   ls -la .env.local

   # Verify environment variables
   pnpm run verify-setup
   ```

### Debug Mode

Enable debug logging for troubleshooting:

```bash
# Enable debug mode
export DEBUG=interview-app:*

# Run with debug logging
pnpm dev
```

## Advanced Configuration

### Custom Tool Configuration

Add custom tools to the devcontainer:

```dockerfile
# .devcontainer/Dockerfile
FROM mcr.microsoft.com/vscode/devcontainers/typescript-node:20

# Install custom tools
RUN npm install -g your-custom-tool

# Add custom configuration
COPY .devcontainer/config/ /home/node/.config/
```

### Custom VS Code Extensions

Add extensions to `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "your-custom-extension"
  ]
}
```

### Custom Git Hooks

Add custom hooks to `lefthook.yml`:

```yaml
pre-commit:
  commands:
    custom-check:
      run: pnpm run custom-check
      glob: "*.{ts,tsx}"
```

## Performance Optimization

### Build Performance

```bash
# Use pnpm for faster installs
pnpm install

# Use build cache
pnpm build --cache

# Parallel test execution
pnpm test --parallel
```

### Development Performance

```bash
# Use watch mode for faster feedback
pnpm test:watch
pnpm typecheck:watch

# Use incremental builds
pnpm build --incremental
```

## Security Considerations

- Environment variables are never committed to the repository
- Git hooks prevent commits with sensitive data
- Devcontainer runs with non-root user
- All dependencies are locked with pnpm-lock.yaml
- Regular security audits with `pnpm audit`

## Next Steps

1. **Customize Configuration**: Modify tool configurations for your specific needs
2. **Add Custom Tools**: Extend the devcontainer with additional development tools
3. **Configure CI/CD**: Set up GitHub Actions for automated testing and deployment
4. **Team Onboarding**: Use this guide to onboard new team members
5. **Documentation**: Keep this guide updated as the environment evolves
