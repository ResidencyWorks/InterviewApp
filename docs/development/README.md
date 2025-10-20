# Development Documentation

This directory contains comprehensive documentation for developing the InterviewApp project.

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/interview-app.git
   cd interview-app
   ```

2. **Open in VS Code with Dev Container**
   ```bash
   code .
   # Click "Reopen in Container" when prompted
   ```

3. **Verify setup**
   ```bash
   pnpm run verify-setup
   ```

4. **Start development**
   ```bash
   pnpm dev
   ```

## Development Environment

### Prerequisites

- Docker Desktop
- VS Code with Dev Containers extension
- Git

### Dev Container Features

- **Node.js 20 LTS** - Latest stable Node.js
- **pnpm 8.15.0** - Fast, disk space efficient package manager
- **Biome** - Fast linter and formatter (replaces ESLint + Prettier)
- **lefthook** - Git hooks manager
- **Vitest** - Fast unit testing framework
- **Playwright** - End-to-end testing

### VS Code Extensions

The following extensions are automatically installed:

- `ms-vscode.vscode-typescript-next` - TypeScript support
- `bradlc.vscode-tailwindcss` - Tailwind CSS support
- `ms-vscode.vscode-json` - JSON support
- `biomejs.biome` - Biome integration
- `esbenp.prettier-vscode` - Prettier (disabled, using Biome)
- `ms-vscode.vscode-eslint` - ESLint (disabled, using Biome)

## Development Workflow

### Git Hooks

The project uses lefthook for git hooks:

- **Pre-commit**: Lint, format, and type check
- **Pre-push**: Run tests and build

### Scripts

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
pnpm format:fix         # Format and fix code
pnpm typecheck          # Type check

# Setup
pnpm setup              # Setup development environment
pnpm verify-setup       # Verify environment setup
```

## Project Structure

```
src/
├── components/         # React components
├── lib/               # Utility functions and configurations
├── pages/             # Next.js pages
├── styles/            # Global styles
├── test/              # Test utilities and setup
└── types/             # TypeScript type definitions

docs/
├── development/       # Development documentation
├── deployment/        # Deployment guides
├── troubleshooting/   # Common issues and solutions
└── api/              # API documentation

tests/
├── e2e/              # End-to-end tests
├── unit/             # Unit tests
└── integration/      # Integration tests
```

## Code Standards

### TypeScript

- Use strict mode
- Prefer `const` over `let`
- Use explicit return types for functions
- Use interfaces for object shapes

### React

- Use functional components with hooks
- Use TypeScript for props
- Follow the component naming convention: `ComponentName`

### Styling

- Use Tailwind CSS for styling
- Follow mobile-first responsive design
- Use CSS modules for component-specific styles

### Testing

- Write unit tests for all utility functions
- Write integration tests for API routes
- Write E2E tests for critical user flows
- Maintain 80% code coverage

## Environment Variables

Copy `env.example` to `.env.local` and configure:

```bash
cp env.example .env.local
```

Required variables:
- `NEXTAUTH_SECRET` - NextAuth secret key
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key

## Troubleshooting

See [troubleshooting guide](../troubleshooting/README.md) for common issues and solutions.

## Contributing

1. Create a feature branch
2. Make your changes
3. Write tests
4. Run the test suite
5. Submit a pull request

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Biome Documentation](https://biomejs.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
