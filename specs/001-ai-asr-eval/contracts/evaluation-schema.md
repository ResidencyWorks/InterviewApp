```markdown
# Evaluation Contract & Zod Schema

This document defines the canonical `EvaluationRequest` and `EvaluationResult` contracts, Zod schema snippets, and token-measurement rules used by the worker and the `/api/evaluate` endpoint.

## EvaluationRequest (contract)

```ts
import { z } from 'zod'

export const EvaluationRequestSchema = z.object({
  requestId: z.uuid(),
  text: z.string().optional(),
  audio_url: z.url().startsWith("https://").optional(),
  metadata: z.record(z.unknown()).optional(),
}).refine((data) => data.text || data.audio_url, {
  message: "Either 'text' or 'audio_url' must be provided",
});

// At least one of text | audio_url must be present
export type EvaluationRequest = z.infer<typeof EvaluationRequestSchema>
```

Rules:
- `requestId` is required and MUST be a UUID (used for idempotency).
- Either `text` or `audio_url` MUST be present; `text` takes precedence for quick synchronous evaluation.
- `audio_url` must be a publicly accessible URL (https).

## EvaluationResult (contract)

```ts
export const EvaluationResultSchema = z.object({
  requestId: z.uuid(),
  jobId: z.string(),
  score: z.number().min(0).max(100),
  feedback: z.string().min(1).max(5000),
  what_changed: z.string().max(2000),
  practice_rule: z.string().max(1000),
  durationMs: z.number().int().nonnegative(),
  tokensUsed: z.number().int().nonnegative().optional(),
  createdAt: z.string().optional(),
})

export type EvaluationResult = z.infer<typeof EvaluationResultSchema>
```

Notes:
- `score` is a 0–100 numeric score. If your evaluator uses a different scale (0–5), normalize to 0–100 before persisting/returning.
- Free-text fields have conservative max lengths to prevent unbounded outputs; adjust if needed.

## GPT Output Shape (Prompting Contract)

When prompting GPT, the worker should ask for JSON strictly matching `EvaluationResult` fields (excluding `jobId`, `durationMs`, `tokensUsed`, `createdAt` which are filled by the worker). Example GPT response chunk expected:

```json
{
  "score": 82,
  "feedback": "Good pacing and clarity; consider varying intonation.",
  "what_changed": "Reduced filler words from 8 to 2; more confident tone.",
  "practice_rule": "Pause for 300ms before answering behavioral questions."
}
```

The worker MUST validate GPT output against `EvaluationResultSchema` (partial) and treat any schema mismatch as a malformed response (trigger retry according to retry policy).

## Token Measurement & Cost Tracking

Rules for token accounting per job:

- For GPT (chat/completions): use the `usage` object returned by OpenAI SDK (e.g., `response.usage.total_tokens`) and persist `tokensUsed` = that value.
- For Whisper (if using OpenAI transcription): if the API returns token-like usage include that under `tokensUsed` (sum with GPT tokens) or store separately if available.
- If provider does not return token usage, record `tokensUsed` as `null` and emit a metric `tokens_unavailable` for that job.
- Persist token usage in `evaluation_results.tokens_used` (integer) when available.

## Error & Retry Classification

- TRANSIENT: Network errors, 5xx from provider, rate-limit (429). Worker retries (exponential backoff) up to 3 attempts.
- PERMANENT: Schema validation errors (GPT returns invalid JSON), 4xx client error on request (except rate-limit). Do NOT retry; persist failure with reason.

## Examples

- Valid `EvaluationRequest` (text):

```json
{ "requestId": "a1b2c3d4-...", "text": "Hello, I'm ready to practice." }
```

- Valid `EvaluationRequest` (audio):

```json
{ "requestId": "a1b2c3d4-...", "audio_url": "https://cdn.example.com/clip.mp3" }
```

Add this file to `specs/001-ai-asr-eval/contracts/` and ensure unit and contract tests assert these shapes before implementation.

```
