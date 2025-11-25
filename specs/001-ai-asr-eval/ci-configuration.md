# CI/CD Configuration for AI/ASR Evaluation

This document provides GitHub Actions configuration snippets for running automated tests and SLA validation in CI/CD pipelines.

## Prerequisites

The CI environment must have:
- Node.js 22.x
- pnpm package manager
- Redis instance (for integration tests and SLA harness)
- Environment variables (OpenAI API key, Supabase credentials, etc.)

## GitHub Actions Workflow

Create `.github/workflows/ai-asr-eval-tests.yml`:

```yaml
name: AI/ASR Evaluation Tests

on:
  push:
    branches: [main, 001-ai-asr-eval]
    paths:
      - 'src/app/api/evaluate/**'
      - 'src/infrastructure/bullmq/**'
      - 'src/infrastructure/openai/**'
      - 'src/infrastructure/supabase/evaluation_store.ts'
      - 'cli/evaluate-harness.ts'
      - 'tests/**/*evaluation*'
  pull_request:
    branches: [main]
    paths:
      - 'src/app/api/evaluate/**'
      - 'src/infrastructure/bullmq/**'
      - 'src/infrastructure/openai/**'

jobs:
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run unit tests
        run: pnpm test:unit

      - name: Check coverage
        run: pnpm test:coverage
        env:
          CI: true

  integration-tests:
    name: Integration Tests (Worker)
    runs-on: ubuntu-latest

    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run integration tests
        run: pnpm test:integration
        env:
          UPSTASH_REDIS_REST_URL: redis://localhost:6379
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY_TEST }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL_TEST }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY_TEST }}
          CI: true

  sla-harness:
    name: SLA Performance Test
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build application
        run: pnpm build
        env:
          SKIP_ENV_VALIDATION: true

      - name: Start Next.js server
        run: pnpm start &
        env:
          UPSTASH_REDIS_REST_URL: redis://localhost:6379
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY_TEST }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL_TEST }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY_TEST }}

      - name: Start worker
        run: pnpm worker:start &
        env:
          UPSTASH_REDIS_REST_URL: redis://localhost:6379
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY_TEST }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL_TEST }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY_TEST }}

      - name: Wait for services
        run: |
          timeout 60 bash -c 'until curl -f http://localhost:3000/api/health; do sleep 2; done'

      - name: Run SLA harness
        run: pnpm test:sla -- --count 20 --timeout 45000
        env:
          API_BASE_URL: http://localhost:3000
          BEARER_TOKEN: ${{ secrets.TEST_BEARER_TOKEN }}

      - name: Upload SLA results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: sla-results
          path: sla-results.json
          retention-days: 30

  lint-and-typecheck:
    name: Lint & Type Check
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run linter
        run: pnpm lint

      - name: Type check
        run: pnpm tsc --noEmit
```

## Required GitHub Secrets

Configure these secrets in your GitHub repository settings:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `OPENAI_API_KEY_TEST` | OpenAI API key for testing | `sk-proj-test123...` |
| `SUPABASE_URL_TEST` | Test Supabase project URL | `https://test.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY_TEST` | Service role key for test DB | `eyJhbG...` |
| `TEST_BEARER_TOKEN` | Auth token for API tests | `test-token-12345` |
| `POSTHOG_API_KEY` | PostHog API key (optional) | `phc_...` |

## Workflow Triggers

**Unit Tests**: Run on every push and PR
- Fast feedback (< 2min)
- No external dependencies

**Integration Tests**: Run on push and PR
- Requires Redis service
- Mock OpenAI responses for consistency

**SLA Harness**: Run only on main branch pushes
- Full end-to-end test
- Uses real OpenAI API (may incur costs)
- Validates performance SLA (p95 < 10s)

## Cost Optimization

To minimize CI costs:

1. **Mock OpenAI in integration tests**:
   ```typescript
   vi.mock("../../src/infrastructure/openai/whisper");
   vi.mock("../../src/infrastructure/openai/gpt_evaluator");
   ```

2. **Limit SLA harness runs**:
   - Only on main branch
   - Use `--count 20` instead of default 25
   - Consider scheduled runs instead of per-commit

3. **Use test API keys**:
   - Separate OpenAI account with rate limits
   - Budget alerts configured

## Alternative: Scheduled SLA Checks

For cost-sensitive projects, run SLA harness on a schedule:

```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
```

## Local CI Simulation

Test the CI configuration locally using [act](https://github.com/nektos/act):

```bash
# Install act
brew install act  # macOS
# or
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Run unit tests locally
act -j unit-tests

# Run with secrets
act -j sla-harness --secret-file .secrets
```

## Monitoring CI Performance

Track these metrics:
- **Test duration**: Unit < 2min, Integration < 5min, SLA < 10min
- **Flakiness**: Retry failed tests, investigate patterns
- **Cost**: Monitor OpenAI API usage in test account
- **SLA pass rate**: Should be > 95% on main branch

## Troubleshooting

### Redis Connection Errors
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```
**Solution**: Ensure Redis service is configured in workflow

### OpenAI Rate Limiting
```
Error: OpenAI API error (429): Rate limit exceeded
```
**Solution**: Use separate test API key with appropriate limits

### SLA Harness Failures
If p95 > 10s:
1. Check OpenAI API latency (external factor)
2. Verify Redis service health
3. Review worker concurrency settings
4. Consider increasing timeout in CI

### Timeout Waiting for Services
```
timeout: failed to run command 'bash': No such file or directory
```
**Solution**: Use `timeout` from coreutils or adjust wait script

## Next Steps

1. Create `.github/workflows/ai-asr-eval-tests.yml`
2. Add required secrets to GitHub repository settings
3. Adjust `--count` and timeouts based on CI environment
4. Monitor first few runs and tune configuration
5. Set up Slack/email notifications for failures

## Related Documentation

- GitHub Actions: https://docs.github.com/en/actions
- Vitest CI: https://vitest.dev/guide/ci
- Redis GitHub Service: https://docs.github.com/en/actions/using-containerized-services/about-service-containers
