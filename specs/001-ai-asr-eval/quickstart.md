# AI/ASR Evaluation API - Quickstart Guide

This guide explains how to use the AI/ASR Evaluation API and run the SLA harness to verify performance.

## Overview

The Evaluation API provides two modes:
- **Text-only evaluation**: Send transcript text directly for instant feedback
- **Audio evaluation**: Provide an audio URL for transcription + evaluation

The system uses:
- **OpenAI Whisper**: For audio transcription
- **GPT-4**: For structured evaluation and scoring
- **BullMQ**: For background job processing
- **Supabase**: For result persistence and idempotency

## Prerequisites

### Required Environment Variables

```bash
# OpenAI API key for Whisper and GPT-4
OPENAI_API_KEY=sk-...

# Supabase connection
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis connection for BullMQ
UPSTASH_REDIS_REST_URL=redis://localhost:6379

# PostHog for analytics (optional)
POSTHOG_API_KEY=your-posthog-key

# Authentication (for API requests)
BEARER_TOKEN=your-auth-token
```

### Running Services

1. **Redis** - Required for BullMQ queue
   ```bash
   # Using Docker
   docker run -d -p 6379:6379 redis:7-alpine

   # Or install locally
   brew install redis  # macOS
   sudo apt-get install redis-server  # Ubuntu
   ```

2. **Next.js API Server**
   ```bash
   pnpm dev
   ```

3. **BullMQ Worker** (in separate terminal)
   ```bash
   pnpm worker:dev
   ```

## API Usage

### Endpoint

```
POST /api/evaluate
```

### Authentication

All requests require a Bearer token:

```bash
Authorization: Bearer <your-token>
```

### Request Format

#### Text-only Evaluation

```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "text": "I have 5 years of experience in software engineering..."
}
```

#### Audio Evaluation

```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440001",
  "audio_url": "https://example.com/interview-recording.mp3"
}
```

### Response Format

#### Successful Completion (200)

```json
{
  "status": "completed",
  "result": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "jobId": "550e8400-e29b-41d4-a716-446655440000",
    "score": 85,
    "feedback": "Strong technical response with clear examples...",
    "what_changed": "Reduced filler words from 8 to 2; more confident delivery.",
    "practice_rule": "Pause for 2 seconds before answering behavioral questions.",
    "durationMs": 2340,
    "tokensUsed": 450,
    "createdAt": "2025-11-20T10:30:00Z"
  }
}
```

#### Async Processing (202)

If evaluation takes longer than 30s, returns:

```json
{
  "status": "processing",
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Evaluation in progress"
}
```

### Example Requests

#### cURL - Text Evaluation

```bash
curl -X POST http://localhost:3000/api/evaluate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "text": "I have 5 years of experience as a software engineer."
  }'
```

#### cURL - Audio Evaluation

```bash
curl -X POST http://localhost:3000/api/evaluate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "requestId": "550e8400-e29b-41d4-a716-446655440001",
    "audio_url": "https://example.com/sample-interview.mp3"
  }'
```

#### JavaScript/TypeScript

```typescript
const response = await fetch('http://localhost:3000/api/evaluate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test-token',
  },
  body: JSON.stringify({
    requestId: crypto.randomUUID(),
    text: 'I have 5 years of experience as a software engineer.',
  }),
});

const result = await response.json();
console.log('Score:', result.result.score);
console.log('Feedback:', result.result.feedback);
```

## SLA Harness

The SLA harness sends multiple requests and measures performance to verify the system meets SLA requirements (p95 < 10s).

### Running the Harness

Basic usage:

```bash
pnpm test:sla
```

### Configuration Options

```bash
# Send 50 requests
pnpm test:sla -- --count 50

# Use production API
pnpm test:sla -- --api-url https://api.example.com --token prod-token

# Custom mix ratio (80% text, 20% audio)
pnpm test:sla -- --mix-ratio 0.8

# Full example
pnpm test:sla -- \
  --count 30 \
  --api-url https://api.example.com \
  --token abc123 \
  --mix-ratio 0.7 \
  --timeout 30000
```

### Environment Variables

```bash
# Alternative to CLI arguments
export API_BASE_URL=http://localhost:3000
export BEARER_TOKEN=test-token
pnpm test:sla
```

### Interpreting Results

The harness outputs comprehensive statistics:

```
📊 Results Summary
==================

Request Status:
  Total: 25
  Completed: 23 (92.0%)
  Processing: 1
  Failed: 1

⏱️  Latency Statistics (All Requests):
Count: 25
Min: 1234.56ms
Max: 8901.23ms
Mean: 3456.78ms
Median (p50): 3200.45ms
p95: 7800.12ms
p99: 8500.67ms

✅ Latency Statistics (Successful Only):
Count: 23
Min: 1234.56ms
Max: 8500.34ms
Mean: 3300.12ms
Median (p50): 3100.23ms
p95: 7600.45ms
p99: 8200.78ms

🪙 Token Usage Statistics:
Count: 23
Min: 120.00 tokens
Max: 650.00 tokens
Mean: 380.50 tokens
Median (p50): 350.00 tokens
p95: 580.00 tokens
p99: 620.00 tokens

🎯 SLA Compliance:
  Target: p95 < 10000ms
  Actual: p95 = 7600.45ms
  Status: ✅ PASS
```

### Key Metrics

- **p50 (Median)**: Typical latency for most requests
- **p95**: 95% of requests complete within this time
- **p99**: 99% of requests complete within this time
- **Success Rate**: Percentage of completed requests

### SLA Targets

| Metric | Target | Priority |
|--------|--------|----------|
| p95 latency | < 10s | **Critical** |
| p99 latency | < 15s | High |
| Success rate | > 95% | **Critical** |
| Mean latency | < 5s | Medium |

### Exit Codes

- `0`: All tests passed, SLA compliance achieved
- `1`: SLA violation or no successful requests

## Troubleshooting

### Common Issues

#### 1. Redis Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solution**: Start Redis server
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

#### 2. OpenAI API Key Missing

```
Error: OpenAI API key not configured
```

**Solution**: Set environment variable
```bash
export OPENAI_API_KEY=sk-...
```

#### 3. Worker Not Running

If requests timeout (202 responses only), the worker may not be running.

**Solution**: Start worker in separate terminal
```bash
pnpm worker:dev
```

#### 4. Authentication Errors (401)

```
HTTP 401: Unauthorized
```

**Solution**: Ensure Bearer token is provided
```bash
pnpm test:sla -- --token your-actual-token
```

#### 5. High Latency / SLA Failures

If p95 > 10s:

1. **Check OpenAI API latency**: Network issues or API slowness
2. **Verify Redis performance**: Local Redis should be < 10ms
3. **Database queries**: Check Supabase query performance
4. **Worker capacity**: Increase concurrency in worker.ts

### Debug Mode

Enable detailed logging:

```bash
# Worker logs
DEBUG=bullmq:* pnpm worker:dev

# API logs (check terminal running pnpm dev)
# Look for [Worker] and [API] prefixed logs
```

### Checking Job Status

View BullMQ queue in Redis:

```bash
redis-cli
> KEYS evaluationQueue:*
> HGETALL evaluationQueue:1234
```

## Performance Optimization

### For Development

1. Use **text-only requests** for faster iteration
2. Reduce harness count: `--count 10`
3. Use **local Redis** (not remote)

### For Production

1. Scale worker concurrency in `worker.ts`:
   ```typescript
   concurrency: 10 // Process 10 jobs in parallel
   ```

2. Use Redis cluster or managed Redis (Upstash)

3. Enable Redis persistence for job recovery

4. Monitor with PostHog events:
   - `job_completed`
   - `score_returned`
   - `job_failed`

## Next Steps

1. **Review contract**: `specs/001-ai-asr-eval/contracts/evaluation-schema.md`
2. **Check implementation**: `specs/001-ai-asr-eval/T018-T023-implementation-summary.md`
3. **Run tests**: `pnpm test:unit`, `pnpm test:integration`
4. **Deploy worker**: See `docs/deployment/` for production setup

## Support

For issues or questions:
- Check logs: Worker output and Next.js dev server
- Review PostHog events for job failures
- Verify all environment variables are set
- Ensure Redis and worker are both running
