import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../../src/app/api/evaluate/webhook/route";
import { evaluationConfig } from "../../src/config";
import * as store from "../../src/infrastructure/supabase/evaluation_store";

// Mock dependencies
vi.mock("../../src/infrastructure/supabase/evaluation_store", () => ({
	upsertResult: vi.fn(),
}));

describe("Webhook Receiver Endpoint", () => {
	const validToken = "test-webhook-secret";

	beforeEach(() => {
		vi.resetAllMocks();
		// Mock config
		vi.spyOn(evaluationConfig, "webhookSecret", "get").mockReturnValue(
			validToken,
		);
	});

	it("should return 401 if token is missing", async () => {
		const req = new NextRequest("http://localhost/api/evaluate/webhook", {
			method: "POST",
			body: JSON.stringify({}),
		});

		const res = await POST(req);
		expect(res.status).toBe(401);
	});

	it("should return 401 if token is invalid", async () => {
		const req = new NextRequest("http://localhost/api/evaluate/webhook", {
			method: "POST",
			headers: { "X-Evaluate-Webhook-Token": "invalid-token" },
			body: JSON.stringify({}),
		});

		const res = await POST(req);
		expect(res.status).toBe(401);
	});

	it("should return 200 and persist result for valid completed payload", async () => {
		const payload = {
			jobId: "job-123",
			status: "completed",
			result: {
				jobId: "job-123",
				requestId: "123e4567-e89b-12d3-a456-426614174000",
				score: 95,
				transcription: "Hello world",
				feedback: "Good job",
				what_changed: "Nothing",
				practice_rule: "Rule 1",
				durationMs: 1000,
				metrics: {
					wpm: 120,
					silence_duration: 0.5,
					filler_words: 0,
				},
			},
		};
		const req = new NextRequest("http://localhost/api/evaluate/webhook", {
			method: "POST",
			headers: { "X-Evaluate-Webhook-Token": validToken },
			body: JSON.stringify(payload),
		});

		const res = await POST(req);
		expect(res.status).toBe(200);
		expect(store.upsertResult).toHaveBeenCalledWith(payload.result);
	});

	it("should return 400 for invalid payload schema", async () => {
		const payload = {
			jobId: "job-123",
			status: "completed",
			result: {
				// Missing required fields like score, transcription
				jobId: "job-123",
			},
		};

		const req = new NextRequest("http://localhost/api/evaluate/webhook", {
			method: "POST",
			headers: { "X-Evaluate-Webhook-Token": validToken },
			body: JSON.stringify(payload),
		});

		const res = await POST(req);
		expect(res.status).toBe(400);
		expect(store.upsertResult).not.toHaveBeenCalled();
	});

	it("should return 200 for non-completed status (ignored)", async () => {
		const payload = {
			jobId: "job-123",
			status: "processing",
		};

		const req = new NextRequest("http://localhost/api/evaluate/webhook", {
			method: "POST",
			headers: { "X-Evaluate-Webhook-Token": validToken },
			body: JSON.stringify(payload),
		});

		const res = await POST(req);
		expect(res.status).toBe(200);
		expect(store.upsertResult).not.toHaveBeenCalled();
	});
});
