```markdown
# PostHog Events Contract

**Source**: `src/infrastructure/posthog/index.ts`

This document defines the analytics events emitted by the AI/ASR evaluation feature.

## Events

### `job_completed`

Emitted when an evaluation job finishes successfully.

| Property | Type | Description |
|---|---|---|
| `jobId` | string | Unique job identifier. |
| `requestId` | UUID | Request identifier. |
| `durationMs` | number | Total processing time. |
| `tokensUsed` | number | Total tokens consumed (Whisper + GPT). |
| `score` | number | The final score (0-100). |
| `audioDurationMs` | number | Duration of the audio file (if applicable). |

### `score_returned`

Emitted when a score is returned to the client (either via sync response or polling/webhook).

| Property | Type | Description |
|---|---|---|
| `jobId` | string | Unique job identifier. |
| `requestId` | UUID | Request identifier. |
| `latencyMs` | number | Time from request to response. |
| `score` | number | The final score. |
| `deliveryMethod` | string | "sync", "polling", or "webhook". |

### `tokens_unavailable`

Emitted when the provider does not return token usage information.

| Property | Type | Description |
|---|---|---|
| `jobId` | string | Unique job identifier. |
| `requestId` | UUID | Request identifier. |
| `provider` | string | "openai" |

### `job_failed`

Emitted when a job fails permanently.

| Property | Type | Description |
|---|---|---|
| `jobId` | string | Unique job identifier. |
| `requestId` | UUID | Request identifier. |
| `errorCode` | string | Normalized error code. |
| `errorMessage` | string | Error message. |
| `attempts` | number | Number of attempts made. |

```
