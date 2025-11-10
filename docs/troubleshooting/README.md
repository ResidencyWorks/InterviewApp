# Troubleshooting Guide

This guide helps you resolve common issues when developing or deploying the InterviewApp project.

## Development Environment Issues

### Dev Container Won't Start

**Problem**: VS Code dev container fails to start or build

**Solutions**:

1. **Check Docker is running**
   ```bash
   docker --version
   docker ps
   ```

2. **Rebuild dev container**
   - VS Code Command Palette: "Dev Containers: Rebuild Container"
   - Or delete `.devcontainer` and recreate

3. **Check Docker resources**
   - Ensure Docker has enough memory (4GB+)
   - Check disk space

4. **Clear Docker cache**
   ```bash
   docker system prune -a
   ```

### Package Installation Issues

**Problem**: `pnpm install` fails or takes too long

**Solutions**:

1. **Clear pnpm cache**
   ```bash
   pnpm store prune
   ```

2. **Delete node_modules and reinstall**
   ```bash
   rm -rf node_modules pnpm-lock.yaml
   pnpm install
   ```

3. **Check network connectivity**
   ```bash
   ping registry.npmjs.org
   ```

### TypeScript Errors

**Problem**: TypeScript compilation errors

**Solutions**:

1. **Check tsconfig.json**
   ```bash
   pnpm tsc --noEmit
   ```

2. **Update type definitions**
   ```bash
   pnpm add -D @types/node @types/react @types/react-dom
   ```

3. **Restart TypeScript server**
   - VS Code Command Palette: "TypeScript: Restart TS Server"

### Biome Linting Issues

**Problem**: Biome linting errors or not working

**Solutions**:

1. **Check Biome installation**
   ```bash
   pnpm biome --version
   ```

2. **Run Biome manually**
   ```bash
   pnpm biome check .
   pnpm biome format .
   ```

3. **Check VS Code extension**
   - Ensure Biome extension is installed and enabled
   - Check VS Code settings for Biome configuration

### Git Hooks Not Working

**Problem**: lefthook hooks not executing

**Solutions**:

1. **Reinstall hooks**
   ```bash
   pnpm lefthook install
   ```

2. **Check hook permissions**
   ```bash
   ls -la .git/hooks/
   ```

3. **Run hooks manually**
   ```bash
   pnpm lefthook run pre-commit
   pnpm lefthook run pre-push
   ```

## Testing Issues

### Vitest Tests Failing

**Problem**: Unit tests fail or don't run

**Solutions**:

1. **Check test configuration**
   ```bash
   pnpm vitest --config vitest.config.ts
   ```

2. **Clear test cache**
   ```bash
   pnpm vitest --run --reporter=verbose
   ```

3. **Check test setup**
   - Verify `src/test/setup.ts` exists
   - Check environment variables

### Playwright E2E Tests Failing

**Problem**: End-to-end tests fail

**Solutions**:

1. **Install Playwright browsers**
   ```bash
   pnpm exec playwright install
   ```

2. **Check test configuration**
   ```bash
   pnpm exec playwright test --list
   ```

3. **Run tests in headed mode**
   ```bash
   pnpm exec playwright test --headed
   ```

4. **Check application is running**
   ```bash
   pnpm dev
   # In another terminal
   pnpm exec playwright test
   ```

## Build Issues

### Build Failures

**Problem**: `pnpm build` fails

**Solutions**:

1. **Check TypeScript errors**
   ```bash
   pnpm tsc --noEmit
   ```

2. **Check for missing dependencies**
   ```bash
   pnpm install
   ```

3. **Clear Next.js cache**
   ```bash
   rm -rf .next
   pnpm build
   ```

4. **Check environment variables**
   - Ensure all required env vars are set
   - Check for typos in variable names

### Memory Issues

**Problem**: Build runs out of memory

**Solutions**:

1. **Increase Node.js memory**
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" pnpm build
   ```

2. **Use swap file (Linux)**
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

## Deployment Issues

### Vercel Deployment Failures

**Problem**: Vercel build fails

**Solutions**:

1. **Check build logs**
   - Go to Vercel dashboard
   - Check deployment logs

2. **Verify environment variables**
   - Ensure all required vars are set
   - Check for typos

3. **Check Node.js version**
   - Ensure Vercel uses Node.js 20
   - Add `.nvmrc` file if needed

### Environment Variable Issues

**Problem**: App fails in production due to missing env vars

**Solutions**:

1. **Check Vercel environment variables**
   - Go to Project Settings > Environment Variables
   - Verify all required vars are set

2. **Use environment validation**
   ```typescript
   import { env } from '@/infrastructure/config/environment'
   // This will throw if env vars are missing
   ```

3. **Check variable names**
   - Ensure exact case sensitivity
   - No typos in variable names

## Performance Issues

### Slow Development Server

**Problem**: `pnpm dev` is slow

**Solutions**:

1. **Check file watching**
   ```bash
   # Increase file watchers (Linux)
   echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
   sudo sysctl -p
   ```

2. **Disable unnecessary features**
   - Disable TypeScript checking in dev
   - Use faster bundler options

3. **Check system resources**
   - Ensure sufficient RAM
   - Close unnecessary applications

### Slow Build Times

**Problem**: Build takes too long

**Solutions**:

1. **Use build cache**
   ```bash
   pnpm build --cache
   ```

2. **Parallel builds**
   ```bash
   pnpm build --parallel
   ```

3. **Optimize dependencies**
   - Remove unused dependencies
   - Use lighter alternatives

## Database Issues

### Supabase Connection Issues

**Problem**: Can't connect to Supabase

**Solutions**:

1. **Check environment variables**
   ```bash
   echo $SUPABASE_URL
   echo $SUPABASE_ANON_KEY
   ```

2. **Verify Supabase project**
   - Check project is active
   - Verify API keys are correct

3. **Check network connectivity**
   ```bash
   curl -I https://your-project.supabase.co
   ```

## Getting Help

### Debug Information

When reporting issues, include:

1. **System information**
   ```bash
   node --version
   pnpm --version
   docker --version
   ```

2. **Error logs**
   - Full error messages
   - Stack traces
   - Console output

3. **Configuration files**
   - `package.json`
   - `tsconfig.json`
   - `vitest.config.ts`
   - `playwright.config.ts`

### Common Commands

```bash
# Verify setup
pnpm run verify-setup

# Clean everything
pnpm run clean:all

# Check all tools
pnpm --version
pnpm biome --version
pnpm lefthook version
npx vitest --version
npx playwright --version

# Run all checks
pnpm lint
pnpm format
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

### Resources

- [Next.js Troubleshooting](https://nextjs.org/docs/messages)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Biome Documentation](https://biomejs.dev/)
- [Vitest Troubleshooting](https://vitest.dev/guide/troubleshooting.html)
- [Playwright Troubleshooting](https://playwright.dev/docs/troubleshooting)
