# PostHog Event Schema Documentation

This document defines all PostHog analytics events emitted by the AI/ASR Evaluation system.

## Overview

Events are emitted at key points in the evaluation workflow to track:
- Job completion and processing times
- Score distribution and evaluation outcomes
- Error rates and failure modes
- System performance and resource usage

All events use the `distinctId` of `"system-worker"` for server-side tracking.

## Event Catalog

### 1. `job_completed`

**Emitted When**: A worker successfully completes an evaluation job (or returns cached result).

**Purpose**: Track job processing metrics, latency, token usage, and caching effectiveness.

**Properties**:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `jobId` | string | Yes | BullMQ job ID |
| `requestId` | string | Yes | UUID from request (for idempotency) |
| `durationMs` | number | Yes | Total processing time in milliseconds |
| `transcriptionDurationMs` | number | No | Time spent on Whisper transcription (audio jobs only) |
| `tokensUsed` | number \| null | Yes | Total OpenAI tokens consumed (null if unavailable) |
| `hadAudio` | boolean | No | Whether job included audio transcription |
| `cached` | boolean | Yes | Whether result was returned from cache (idempotency) |

**Example**:
```typescript
{
  jobId: "550e8400-e29b-41d4-a716-446655440000",
  requestId: "550e8400-e29b-41d4-a716-446655440000",
  durationMs: 3450,
  transcriptionDurationMs: 1200,
  tokensUsed: 420,
  hadAudio: true,
  cached: false
}
```

**Use Cases**:
- Calculate p50/p95/p99 latency percentiles
- Measure cache hit rate
- Track token consumption and cost
- Compare audio vs text processing times

---

### 2. `score_returned`

**Emitted When**: An evaluation score is successfully generated and returned.

**Purpose**: Track score distribution and evaluation quality.

**Properties**:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `requestId` | string | Yes | UUID from request |
| `score` | number | Yes | Evaluation score (0-100) |
| `cached` | boolean | Yes | Whether score was from cache |

**Example**:
```typescript
{
  requestId: "550e8400-e29b-41d4-a716-446655440000",
  score: 85,
  cached: false
}
```

**Use Cases**:
- Analyze score distribution
- Detect scoring anomalies
- A/B test different prompts

---

### 3. `job_failed`

**Emitted When**: A worker fails to complete an evaluation job.

**Purpose**: Monitor error rates and identify failure patterns.

**Properties**:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `jobId` | string | Yes | BullMQ job ID |
| `requestId` | string | Yes | UUID from request |
| `durationMs` | number | Yes | Time before failure |
| `error` | string | Yes | Error message |

**Example**:
```typescript
{
  jobId: "550e8400-e29b-41d4-a716-446655440000",
  requestId: "550e8400-e29b-41d4-a716-446655440000",
  durationMs: 1500,
  error: "OpenAI API error (429): Rate limit exceeded"
}
```

**Common Error Patterns**:
- `"OpenAI API error (429)"`: Rate limiting
- `"OpenAI API error (5xx)"`: OpenAI service issues
- `"GPT response validation failed"`: Schema mismatch
- `"Failed to fetch audio"`: Invalid audio URL

---

## Event Flow Diagrams

### Successful Evaluation
```
Worker → getByRequestId (cache miss)
       → transcribeAudio (if audio)
       → evaluateTranscript
       → upsertResult
       → emit: job_completed { cached: false }
       → emit: score_returned { cached: false }
```

### Cached Result
```
Worker → getByRequestId (cache hit)
       → emit: job_completed { cached: true }
       → emit: score_returned { cached: true }
       → return cached result
```

### Failed Evaluation
```
Worker → getByRequestId
       → transcribeAudio → ERROR
       → emit: job_failed
       → throw (BullMQ retries)
```

---

## Implementation

**Location**: `src/infrastructure/bullmq/worker.ts`

**PostHog Client**: `src/infrastructure/posthog/index.ts`

```typescript
import { captureEvent } from "../posthog";

// Success
captureEvent("job_completed", {
  jobId: job.id,
  requestId,
  durationMs,
  tokensUsed: result.tokensUsed ?? null,
  cached: false,
});

// Failure
captureEvent("job_failed", {
  jobId: job.id,
  requestId,
  durationMs,
  error: error.message,
});
```

---

## Monitoring & Alerts

### Recommended Alerts

1. **High Error Rate**: `job_failed` count > 5% of total
2. **SLA Violation**: p95 of `durationMs` > 10000ms
3. **Token Budget**: Sum of `tokensUsed` > daily limit
4. **Rate Limit**: `job_failed` with "429" > 3/min

---

## Privacy & Compliance

**PII Handling**:
- ❌ Never include: transcript text, audio URLs, feedback
- ✅ Safe to include: requestId (UUID), scores, durations, tokens

**Data Retention**: 30-90 days per PostHog policy

---

## Related Documentation

- Worker: `src/infrastructure/bullmq/worker.ts`
- Schema: `specs/001-ai-asr-eval/contracts/evaluation-schema.md`
- Quickstart: `specs/001-ai-asr-eval/quickstart.md`
