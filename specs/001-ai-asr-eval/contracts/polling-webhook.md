# Polling & Webhook Contract

**Source**: `src/app/api/evaluate/status/[jobId]/route.ts` (Polling)
**Source**: `src/app/api/evaluate/webhook/route.ts` (Webhook Receiver - Optional)

## Polling Endpoint

`GET /api/evaluate/status/:jobId`

### Response (200 OK)

Returns the current status of the job.

```json
{
  "jobId": "string",
  "requestId": "uuid",
  "status": "queued" | "processing" | "completed" | "failed",
  "result": {
    // Only present if status === "completed"
    "requestId": "uuid",
    "jobId": "string",
    "score": number,
    "feedback": "string",
    "what_changed": "string",
    "practice_rule": "string",
    "durationMs": number,
    "tokensUsed": number
  } | null,
  "error": {
    // Only present if status === "failed"
    "code": "string",
    "message": "string"
  } | null,
  "poll_after_ms": number // Suggested polling interval (0 if completed/failed)
}
```

### Response (404 Not Found)

If `jobId` does not exist.

```json
{
  "error": "Job not found"
}
```

## Webhook Dispatch

When a webhook URL is configured, the worker will POST the result to that URL upon job completion or failure.

### Headers

- `Content-Type`: `application/json`
- `X-Evaluate-Webhook-Token`: `<configured-secret>`

### Payload

The payload matches the Polling Response (200 OK) shape.

```json
{
  "jobId": "string",
  "requestId": "uuid",
  "status": "completed" | "failed",
  "result": { ... } | null,
  "error": { ... } | null,
  "poll_after_ms": 0
}
```

### Retry Policy

- The system will retry webhook delivery on transient errors (Network, 5xx).
- Max attempts: 3
- Backoff: Exponential (1s, 3s, 9s)
- Permanent errors (4xx, except 429) are not retried.
