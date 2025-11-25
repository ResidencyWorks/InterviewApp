# Research: Dev Environment & Tooling

**Feature**: 004-dev-environment-tooling
**Date**: 2025-01-27
**Purpose**: Resolve technical unknowns and establish implementation patterns

## Research Tasks

### 1. Devcontainer Configuration Patterns

**Task**: Research VS Code devcontainer configuration patterns for Node.js development with comprehensive tooling

**Decision**: Use multi-stage Dockerfile with Node.js LTS, pnpm, and all development tools pre-installed

**Rationale**:

- Devcontainer provides consistent development environment across all developers
- Multi-stage build optimizes image size and build time
- Pre-installed tools eliminate setup time and version conflicts
- VS Code integration provides seamless development experience

**Alternatives considered**:

- Manual setup instructions: Error-prone and time-consuming
- Docker Compose only: Less integrated with VS Code
- Cloud-based development: Additional cost and complexity

**Implementation details**:

- Use `mcr.microsoft.com/vscode/devcontainers/typescript-node` as base
- Install pnpm globally in container
- Pre-install Biome, lefthook, and other development tools
- Configure VS Code extensions and settings
- Set up proper file permissions and user mapping

### 2. Git Hooks with Lefthook

**Task**: Research lefthook configuration patterns for comprehensive git hook management

**Decision**: Use lefthook with pre-commit (lint, format, typecheck) and pre-push (full test suite) hooks

**Rationale**:

- Lefthook provides better performance than husky
- YAML configuration is more maintainable than shell scripts
- Parallel execution improves hook performance
- Better error reporting and debugging capabilities

**Alternatives considered**:

- Husky: Slower performance, more complex configuration
- Custom shell scripts: More maintenance, less features
- No git hooks: Poor code quality enforcement

**Implementation details**:

```yaml
pre-commit:
  parallel: true
  commands:
    lint:
      run: pnpm biome check --write .
      glob: "*.{ts,tsx,js,jsx,json}"
    typecheck:
      run: pnpm tsc --noEmit
    format:
      run: pnpm biome format --write .
      glob: "*.{ts,tsx,js,jsx,json}"

pre-push:
  parallel: true
  commands:
    test:
      run: pnpm test
    e2e:
      run: pnpm test:e2e
```

### 3. Biome Configuration for TypeScript

**Task**: Research Biome configuration patterns for TypeScript projects with strict linting and formatting

**Decision**: Use Biome with strict TypeScript rules, import sorting, and consistent formatting

**Rationale**:

- Biome provides faster performance than ESLint + Prettier
- Single tool reduces configuration complexity
- Better TypeScript support and type-aware linting
- Consistent formatting and import organization

**Alternatives considered**:

- ESLint + Prettier: Slower, more configuration complexity
- Custom formatting: More development time and maintenance
- No linting/formatting: Poor code quality and consistency

**Implementation details**:

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
      },
      "style": {
        "useConst": "error"
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

### 4. Conventional Commit Enforcement

**Task**: Research conventional commit validation patterns with lefthook

**Decision**: Use commit-msg hook with conventional commit regex validation

**Rationale**:

- Conventional commits enable automated changelog generation
- Consistent commit messages improve project history readability
- Enables automated versioning and release management
- Integrates well with CI/CD pipelines

**Alternatives considered**:

- No commit message validation: Inconsistent project history
- Manual commit message guidelines: Not enforced, often ignored
- Third-party tools: Additional dependencies and complexity

**Implementation details**:

```bash
#!/bin/bash
# commit-msg hook
commit_regex='^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .{1,50}'

if ! grep -qE "$commit_regex" "$1"; then
    echo "Invalid commit message format!"
    echo "Format: type(scope): description"
    echo "Types: feat, fix, docs, style, refactor, test, chore"
    exit 1
fi
```

### 5. Environment Variable Management

**Task**: Research environment variable management patterns for comprehensive .env.example

**Decision**: Use .env.example with all required keys, validation, and clear documentation

**Rationale**:

- .env.example provides clear documentation of required environment variables
- Validation prevents runtime errors from missing variables
- Clear documentation reduces onboarding time
- Separates concerns between different environments

**Alternatives considered**:

- No environment template: Poor developer experience
- Hardcoded values: Security risks and inflexibility
- Complex environment management: Over-engineering for M0

**Implementation details**:

```bash
# .env.example
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

### 6. Test Configuration with Vitest and Playwright

**Task**: Research test configuration patterns for unit, integration, and E2E testing

**Decision**: Use Vitest for unit/integration tests and Playwright for E2E tests with comprehensive configuration

**Rationale**:

- Vitest provides faster execution than Jest with better TypeScript support
- Playwright provides reliable E2E testing across browsers
- Separate configurations allow different test strategies
- Integrates well with CI/CD pipelines

**Alternatives considered**:

- Jest: Slower execution, less TypeScript integration
- Cypress: More complex setup, different API
- No E2E testing: Poor user experience validation

**Implementation details**:

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

### 7. CI/CD Pipeline Configuration

**Task**: Research GitHub Actions configuration patterns for comprehensive CI/CD

**Decision**: Use GitHub Actions with separate workflows for CI, testing, and deployment

**Rationale**:

- GitHub Actions provides native integration with GitHub repositories
- Separate workflows allow independent execution and debugging
- Matrix builds enable testing across multiple Node.js versions
- Integrates well with Vercel deployment

**Alternatives considered**:

- Other CI providers: Less integration with GitHub
- Single workflow: Less flexibility and debugging capability
- No CI/CD: Poor code quality and deployment reliability

**Implementation details**:

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm test:e2e
```

### 8. Documentation Patterns

**Task**: Research documentation patterns for comprehensive developer onboarding

**Decision**: Use structured README with setup instructions, script documentation, and hook behavior

**Rationale**:

- Clear documentation reduces onboarding time and support requests
- Structured format makes information easy to find
- Script documentation helps developers understand tooling
- Hook behavior documentation prevents confusion

**Alternatives considered**:

- Minimal documentation: Poor developer experience
- Overly complex documentation: Information overload
- No documentation: High onboarding friction

**Implementation details**:

- README.md with quick start and detailed setup
- CONTRIBUTING.md with development guidelines
- DEVELOPMENT.md with environment details
- HOOKS.md with git hook behavior documentation
- Inline code comments for complex configurations

## Research Summary

All technical unknowns have been resolved with concrete implementation decisions. The Dev Environment & Tooling will use:

1. **Devcontainer**: Multi-stage Dockerfile with pre-installed tools
2. **Git Hooks**: Lefthook with pre-commit and pre-push hooks
3. **Linting/Formatting**: Biome with strict TypeScript rules
4. **Commits**: Conventional commit validation with commit-msg hook
5. **Environment**: Comprehensive .env.example with validation
6. **Testing**: Vitest for unit/integration, Playwright for E2E
7. **CI/CD**: GitHub Actions with separate workflows
8. **Documentation**: Structured README with comprehensive guides

These decisions align with the project constitution and provide a robust, maintainable, and developer-friendly environment setup.

## Performance Targets

- **Fresh Clone Setup**: ≤5 minutes from clone to running development server
- **Pre-commit Hooks**: ≤30 seconds for lint, format, and typecheck
- **Pre-push Hooks**: ≤2 minutes for full test suite execution
- **CI Pipeline**: ≤10 minutes for complete CI/CD pipeline execution
- **Docker Build**: ≤3 minutes for devcontainer image build

## Security Considerations

- Environment variables properly documented and validated
- No secrets committed to repository
- Git hooks prevent commits with sensitive data
- CI/CD pipelines use secure secret management
- Devcontainer runs with non-root user for security
