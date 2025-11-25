import { describe, expect, it } from "vitest";

describe("PostHog Events Contract", () => {
	it("defines job_completed event structure", () => {
		const event = {
			jobId: "eval:123",
			requestId: "uuid-123",
			durationMs: 2000,
			tokensUsed: 150,
			score: 90,
			audioDurationMs: 5000,
		};

		expect(event).toHaveProperty("jobId");
		expect(event).toHaveProperty("requestId");
		expect(event).toHaveProperty("durationMs");
		expect(event).toHaveProperty("tokensUsed");
		expect(event).toHaveProperty("score");
		expect(event).toHaveProperty("audioDurationMs");
	});

	it("defines score_returned event structure", () => {
		const event = {
			jobId: "eval:123",
			requestId: "uuid-123",
			latencyMs: 2100,
			score: 90,
			deliveryMethod: "sync",
		};

		expect(event).toHaveProperty("jobId");
		expect(event).toHaveProperty("requestId");
		expect(event).toHaveProperty("latencyMs");
		expect(event).toHaveProperty("score");
		expect(event).toHaveProperty("deliveryMethod");
	});

	it("defines tokens_unavailable event structure", () => {
		const event = {
			jobId: "eval:123",
			requestId: "uuid-123",
			provider: "openai",
		};

		expect(event).toHaveProperty("jobId");
		expect(event).toHaveProperty("requestId");
		expect(event).toHaveProperty("provider");
	});

	it("defines job_failed event structure", () => {
		const event = {
			jobId: "eval:123",
			requestId: "uuid-123",
			errorCode: "audio_too_long",
			errorMessage: "Audio exceeds limit",
			attempts: 1,
		};

		expect(event).toHaveProperty("jobId");
		expect(event).toHaveProperty("requestId");
		expect(event).toHaveProperty("errorCode");
		expect(event).toHaveProperty("errorMessage");
		expect(event).toHaveProperty("attempts");
	});
});
