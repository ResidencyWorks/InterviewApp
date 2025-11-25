import { describe, expect, it } from "vitest";

describe("Polling & Webhook Contract", () => {
	it("defines the polling response structure", () => {
		const pollingResponse = {
			jobId: "eval:123",
			requestId: "uuid-123",
			status: "completed",
			result: {
				requestId: "uuid-123",
				jobId: "eval:123",
				score: 85,
				feedback: "Good job",
				what_changed: "Improved tone",
				practice_rule: "Pause more",
				durationMs: 1500,
				tokensUsed: 100,
			},
			error: null,
			poll_after_ms: 0,
		};

		expect(pollingResponse).toHaveProperty("jobId");
		expect(pollingResponse).toHaveProperty("requestId");
		expect(pollingResponse).toHaveProperty("status");
		expect(pollingResponse).toHaveProperty("result");
		expect(pollingResponse).toHaveProperty("error");
		expect(pollingResponse).toHaveProperty("poll_after_ms");
	});

	it("defines the webhook payload structure", () => {
		const webhookPayload = {
			jobId: "eval:123",
			requestId: "uuid-123",
			status: "failed",
			result: null,
			error: {
				code: "audio_too_long",
				message: "Audio exceeds 5 minutes",
			},
			poll_after_ms: 0,
		};

		expect(webhookPayload).toHaveProperty("jobId");
		expect(webhookPayload).toHaveProperty("requestId");
		expect(webhookPayload).toHaveProperty("status");
		expect(webhookPayload).toHaveProperty("result");
		expect(webhookPayload).toHaveProperty("error");
		expect(webhookPayload).toHaveProperty("poll_after_ms");
	});
});
