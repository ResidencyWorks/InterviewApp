# AI/ASR Evaluation API - Architecture & Setup

## Overview

The AI/ASR Evaluation API is a Next.js-based system that provides automated feedback and scoring for interview practice responses. It supports both text-only and audio input, using OpenAI's Whisper for transcription and GPT-4 for evaluation.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Applications                          │
│                    (Web, Mobile, CLI Harness)                       │
└────────────────────────────────┬────────────────────────────────────┘
                                 │ HTTPS
                                 │ POST /api/evaluate
                                 │ Bearer Token Auth
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Next.js API Route                            │
│                   src/app/api/evaluate/route.ts                     │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Authenticate (Bearer token)                                      │
│ 2. Validate request (Zod schema)                                    │
│ 3. Check idempotency (getByRequestId)                              │
│ 4. Enqueue job (BullMQ)                                            │
│ 5. Wait sync (30s timeout) OR return 202                           │
└────────────────┬───────────────┬────────────────────────────────────┘
                 │               │
                 │               │ Job enqueued
                 │               ▼
                 │    ┌──────────────────────────────┐
                 │    │      Redis (BullMQ Queue)    │
                 │    │   EVALUATION_QUEUE_NAME      │
                 │    └──────────┬───────────────────┘
                 │               │
                 │               │ Job dequeued
                 │               ▼
                 │    ┌──────────────────────────────────────────────┐
                 │    │           BullMQ Worker Process              │
                 │    │    src/infrastructure/bullmq/worker.ts       │
                 │    ├──────────────────────────────────────────────┤
                 │    │ 1. Check cache (idempotency)                │
                 │    │ 2. Transcribe audio (if needed)             │
                 │    │ 3. Evaluate with GPT-4                       │
                 │    │ 4. Validate result (Zod)                     │
                 │    │ 5. Persist to Supabase                       │
                 │    │ 6. Emit PostHog events                       │
                 │    └─────┬──────────┬──────────┬──────────────────┘
                 │          │          │          │
                 ▼          ▼          ▼          ▼
        ┌─────────────┐  ┌────────┐  ┌────────┐  ┌───────────┐
        │  Supabase   │  │ Whisper│  │  GPT-4 │  │  PostHog  │
        │  Postgres   │  │  API   │  │  API   │  │ Analytics │
        │             │  │        │  │        │  │           │
        │ evaluation_ │  │ Audio  │  │ Score  │  │  Events   │
        │  results    │  │ → Text │  │ + Eval │  │  Tracking │
        └─────────────┘  └────────┘  └────────┘  └───────────┘
             │
             │ Result stored
             │
             ▼
        ┌─────────────────────────────────────────┐
        │         Response to Client              │
        │  { status, result, score, feedback }    │
        └─────────────────────────────────────────┘
```

## Component Responsibilities

### 1. API Route (`src/app/api/evaluate/route.ts`)
**Role**: HTTP endpoint, request validation, orchestration

**Responsibilities**:
- Authenticate requests (Bearer token)
- Validate input against `EvaluationRequestSchema`
- Check for existing results (idempotency via `requestId`)
- Enqueue jobs to BullMQ
- Handle sync/async response patterns
- Return 200 (completed), 202 (processing), or 4xx/5xx errors

**Key Dependencies**:
- `BullMQ`: Queue management
- `Zod`: Schema validation
- `QueueEvents`: Job monitoring

**Performance**:
- Sync timeout: 30s
- Returns immediately if cached result exists

---

### 2. BullMQ Worker (`src/infrastructure/bullmq/worker.ts`)
**Role**: Background job processor

**Responsibilities**:
- Dequeue jobs from Redis
- Check idempotency (skip if already processed)
- Orchestrate transcription + evaluation pipeline
- Validate results against schema
- Persist results to Supabase
- Emit analytics events to PostHog
- Handle retries (exponential backoff, max 3 attempts)

**Processing Flow**:
```typescript
async function processJob(job) {
  // 1. Idempotency check
  const existing = await getByRequestId(requestId);
  if (existing) return existing;

  // 2. Transcription (if audio)
  let transcript = text;
  if (audio_url) {
    transcript = await transcribeAudio(audio_url);
  }

  // 3. Evaluation
  const evaluation = await evaluateTranscript(transcript);

  // 4. Validation
  EvaluationResultSchema.parse(evaluation);

  // 5. Persistence
  await upsertResult(evaluation);

  // 6. Analytics
  captureEvent("job_completed", {...});
  captureEvent("score_returned", {...});

  return evaluation;
}
```

**Retry Strategy**:
- Transient errors (5xx, 429, network): Retry with backoff
- Permanent errors (4xx, validation): Don't retry

**Concurrency**: 1 (configurable in worker.ts)

---

### 3. Whisper Integration (`src/infrastructure/openai/whisper.ts`)
**Role**: Audio transcription

**Responsibilities**:
- Fetch audio from provided HTTPS URL
- Convert to format suitable for OpenAI API
- Call Whisper API with `verbose_json` response format
- Extract transcript text and duration
- Handle API errors (4xx, 5xx, network)

**API Call**:
```typescript
const transcription = await client.audio.transcriptions.create({
  file: audioFile,
  model: "whisper-1",
  language: "en",
  response_format: "verbose_json",
});
```

**Performance**: Typically 1-3s for 1min audio

---

### 4. GPT-4 Evaluator (`src/infrastructure/openai/gpt_evaluator.ts`)
**Role**: Structured evaluation and scoring

**Responsibilities**:
- Send transcript to GPT-4 with evaluation prompt
- Use structured output (`zodResponseFormat`) to enforce schema
- Parse response and extract score, feedback, recommendations
- Capture token usage for cost tracking
- Validate response against `EvaluationResultSchema`

**API Call**:
```typescript
const completion = await client.chat.completions.parse({
  model: "gpt-4o-2024-08-06",
  messages: [
    { role: "system", content: EVALUATION_PROMPT },
    { role: "user", content: transcript },
  ],
  response_format: zodResponseFormat(GPTEvaluationSchema, "evaluation"),
  temperature: 0.3,
});
```

**Output**:
- `score`: 0-100 numeric score
- `feedback`: Detailed constructive feedback (1-5000 chars)
- `what_changed`: Improvements noted (max 2000 chars)
- `practice_rule`: Actionable rule for next practice (max 1000 chars)
- `tokensUsed`: Token count from API response

**Performance**: Typically 2-5s depending on transcript length

---

### 5. Supabase Store (`src/infrastructure/supabase/evaluation_store.ts`)
**Role**: Persistent storage and idempotency

**Responsibilities**:
- `getByRequestId`: Retrieve existing result by requestId
- `upsertResult`: Insert or update evaluation result
- Map between domain models and database schema

**Schema** (`evaluation_results` table):
```sql
CREATE TABLE evaluation_results (
  request_id UUID PRIMARY KEY,
  job_id TEXT NOT NULL,
  score NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  feedback TEXT NOT NULL,
  what_changed TEXT,
  practice_rule TEXT,
  duration_ms INTEGER NOT NULL,
  tokens_used INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_evaluation_results_created_at
  ON evaluation_results(created_at);
```

**Idempotency**: Uses `request_id` as primary key (upsert on conflict)

---

### 6. PostHog Analytics (`src/infrastructure/posthog/index.ts`)
**Role**: Event tracking and monitoring

**Responsibilities**:
- Emit `job_completed` events with latency and token metrics
- Emit `score_returned` events with score distribution
- Emit `job_failed` events with error details
- Provide observability into system performance

**Events**: See `specs/001-ai-asr-eval/contracts/posthog-events.md`

---

## Data Flow

### Text-Only Evaluation
```
1. Client → POST /api/evaluate { requestId, text }
2. API Route → Validate → Enqueue → Wait (30s)
3. Worker → getByRequestId (miss) → evaluateTranscript → upsertResult
4. GPT-4 → Structured evaluation → Score + Feedback
5. Worker → Emit events → Return result
6. API Route → Return 200 + result
```

**Typical Latency**: 2-4s (p95: 5-7s)

### Audio Evaluation
```
1. Client → POST /api/evaluate { requestId, audio_url }
2. API Route → Validate → Enqueue → Wait (30s)
3. Worker → getByRequestId (miss) → transcribeAudio → evaluateTranscript
4. Whisper → Audio → Transcript (1-3s)
5. GPT-4 → Transcript → Score + Feedback (2-5s)
6. Worker → upsertResult → Emit events → Return
7. API Route → Return 200 + result
```

**Typical Latency**: 5-8s (p95: 8-12s)

### Cached/Idempotent Request
```
1. Client → POST /api/evaluate { requestId, text }
2. API Route → Validate → getByRequestId (hit) → Return 200
```

**Typical Latency**: < 100ms

---

## Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **API Framework** | Next.js 16 (App Router) | HTTP endpoints, routing |
| **Queue** | BullMQ 5.64 | Job queue and processing |
| **Redis** | Upstash Redis / Local | Queue backend |
| **Database** | Supabase Postgres | Result persistence |
| **Transcription** | OpenAI Whisper API | Audio → Text |
| **Evaluation** | OpenAI GPT-4o | Text → Score + Feedback |
| **Analytics** | PostHog | Event tracking |
| **Validation** | Zod 4.1 | Schema validation |
| **Language** | TypeScript 5.9 | Type safety |
| **Runtime** | Node.js 22.x | Server execution |

---

## Local Development Setup

### 1. Prerequisites

```bash
# Required tools
node --version  # v22.x
pnpm --version  # v9.x
docker --version  # For Redis
```

### 2. Clone and Install

```bash
git clone https://github.com/ResidencyWorks/InterviewApp.git
cd InterviewApp
git checkout 001-ai-asr-eval
pnpm install
```

### 3. Environment Variables

Create `.env.local`:

```bash
# OpenAI API
OPENAI_API_KEY=sk-...

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis (local)
UPSTASH_REDIS_REST_URL=redis://localhost:6379

# PostHog (optional)
POSTHOG_API_KEY=your-posthog-key
POSTHOG_HOST=https://app.posthog.com

# Auth (for testing)
BEARER_TOKEN=test-token
```

### 4. Start Services

**Terminal 1 - Redis**:
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

**Terminal 2 - Next.js Dev Server**:
```bash
pnpm dev
```

**Terminal 3 - BullMQ Worker**:
```bash
pnpm worker:dev
```

### 5. Verify Setup

```bash
# Check API health
curl http://localhost:3000/api/health

# Send test evaluation
curl -X POST http://localhost:3000/api/evaluate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "requestId": "'$(uuidgen)'",
    "text": "I have 5 years of experience in software engineering."
  }'
```

### 6. Run Tests

```bash
# Unit tests
pnpm test:unit

# Integration tests (requires Redis)
pnpm test:integration

# SLA harness
pnpm test:sla
```

---

## Production Deployment

### Build

```bash
# Build Next.js app
pnpm build

# Build worker (separate process)
pnpm build:worker
```

### Environment Configuration

**Required**:
- `OPENAI_API_KEY`: OpenAI API key
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (server-side only)
- `UPSTASH_REDIS_REST_URL`: Redis connection string (Upstash or self-hosted)

**Optional**:
- `POSTHOG_API_KEY`: PostHog analytics
- `SENTRY_DSN`: Error tracking
- `REQUEST_TIMEOUT_MS`: Sync timeout (default: 30000)

### Deployment Options

**Option 1: Vercel (Recommended for API)**
```bash
vercel deploy --prod
```

**Worker**: Deploy separately (e.g., Railway, Render, AWS ECS)

**Option 2: Docker**
```dockerfile
# Dockerfile.worker
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN pnpm install --production
COPY dist/ ./dist/
CMD ["node", "dist/infrastructure/bullmq/worker.js"]
```

### Scaling Considerations

**API Route**:
- Horizontal scaling via Vercel/load balancer
- Stateless design (no local caching)
- Auto-scaling based on request volume

**Worker**:
- Scale worker instances independently
- Increase concurrency in `worker.ts` (default: 1)
- Monitor queue depth and adjust worker count

**Redis**:
- Use managed Redis (Upstash, AWS ElastiCache)
- Enable persistence for job recovery
- Monitor memory usage

---

## Monitoring & Observability

### Metrics to Track

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| p95 Latency | < 10s | > 10s |
| Error Rate | < 5% | > 5% |
| Cache Hit Rate | > 10% | < 5% |
| Token Usage | < budget | > 90% of budget |
| Queue Depth | < 100 | > 500 |

### Logging

**Worker Logs**:
```
[Worker] Processing job 123 for request abc
[Worker] Transcribing audio from https://...
[Worker] Transcription completed in 1234ms
[Worker] Evaluating transcript (234 chars)
[Worker] Evaluation completed: score=85, tokens=420
[Worker] Result persisted for request abc
[Worker] Job 123 completed successfully
```

**API Logs**:
```
[API] POST /api/evaluate - 200 OK - 2340ms
[API] Idempotency hit for request abc
[API] Job timeout, returning 202 for request xyz
```

### PostHog Dashboards

- **Performance**: p50/p95/p99 latency over time
- **Quality**: Score distribution histogram
- **Reliability**: Error rate and failure modes
- **Cost**: Token usage and API spend

---

## Security

**Authentication**:
- Bearer token required for all requests
- Tokens validated against environment variable or database

**Authorization**:
- API route checks `Authorization` header
- Returns 401 Unauthorized if missing/invalid

**Input Validation**:
- Zod schemas enforce request structure
- UUID validation for `requestId`
- URL validation for `audio_url` (HTTPS only)
- Text length limits (configurable)

**Data Privacy**:
- No sensitive data in logs or analytics
- `requestId` is pseudonymous (UUID)
- Audio URLs must be publicly accessible (no auth)

---

## Performance Tuning

### API Route Optimization
- Enable HTTP/2 for multiplexing
- Use CDN for static assets
- Implement request throttling

### Worker Optimization
- Increase concurrency: `concurrency: 5` in worker config
- Use connection pooling for Supabase
- Cache GPT prompts if identical across requests

### Database Optimization
- Index on `request_id` (primary key)
- Index on `created_at` for time-range queries
- Consider partitioning by date for large datasets

### Cost Optimization
- Use GPT-4 mini for simple evaluations
- Implement token budgets per user/tenant
- Cache common evaluations (fuzzy matching)

---

## Troubleshooting

See `specs/001-ai-asr-eval/quickstart.md` for detailed troubleshooting guide.

**Common Issues**:
- Redis connection errors → Check `UPSTASH_REDIS_REST_URL`
- OpenAI API 429 → Rate limiting, implement backoff
- Worker not processing → Verify worker is running
- High latency → Check OpenAI API status, optimize concurrency

---

## Related Documentation

- **Quickstart**: `specs/001-ai-asr-eval/quickstart.md`
- **API Contract**: `specs/001-ai-asr-eval/contracts/evaluation-schema.md`
- **PostHog Events**: `specs/001-ai-asr-eval/contracts/posthog-events.md`
- **Tasks**: `specs/001-ai-asr-eval/tasks.md`
- **Implementation Summary**: `specs/001-ai-asr-eval/T018-T023-implementation-summary.md`

---

## Support

For issues or questions:
- Review worker logs and Next.js dev server output
- Check PostHog for error events
- Verify all environment variables are set
- Ensure Redis and worker are running
