```markdown
# Error Code Contract: AI/ASR Evaluation

Authoritative list of error codes, their classification, and retry policy for the evaluation feature.

| Code | Type | Description | Retry Policy |
|------|------|-------------|--------------|
| audio_too_long | PERMANENT | Audio length >300s exceeds sync threshold | No retry |
| malformed_gpt_output | TRANSIENT* | GPT response failed schema validation | Retry up to 3 attempts (backoff) |
| transcription_empty | PERMANENT | Whisper produced empty transcript | No retry |
| network_error | TRANSIENT | Network failure contacting provider | Retry up to 3 attempts |
| provider_timeout | TRANSIENT | Whisper/GPT timed out | Retry up to 3 attempts |
| rate_limited | TRANSIENT | Provider returned 429 | Respect provider Retry-After; count against attempts |
| auth_failed | PERMANENT | Invalid or missing API credential | No retry |
| webhook_delivery_failed | TRANSIENT | Webhook endpoint unreachable / 5xx | Retry up to 3 attempts (1s, 3s, 9s) |
| tokens_unavailable | INFO | Provider omitted token usage info | No retry; emit info event |

TRANSIENT*: `malformed_gpt_output` treated as transient until attempts exhausted; then final failure stored.

## Usage Guidance
- Worker must map exceptions to one of these codes and decide retry eligibility.
- PostHog events should include `errorCode` when status is failed.
- Contract tests (T042) validate table alignment with implementation.

```
