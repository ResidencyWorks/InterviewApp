import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

/**
 * Unit tests for /api/evaluate route (T017)
 * Tests: validation, auth enforcement, idempotency, sync/async behavior
 */

describe("POST /api/evaluate", () => {
	const mockRequest = (opts: {
		headers?: Record<string, string>;
		body?: object;
	}): NextRequest => {
		const headers = new Headers(opts.headers || {});
		return {
			headers,
			json: vi.fn().mockResolvedValue(opts.body || {}),
		} as unknown as NextRequest;
	};

	describe("Authentication", () => {
		it("returns 401 when no authorization header", async () => {
			const req = mockRequest({
				body: {
					requestId: randomUUID(),
					text: "Sample answer",
				},
			});

			// Mock the POST handler from route.ts
			const { POST } = await import("../../src/app/api/evaluate/route");
			const response = await POST(req);

			expect(response.status).toBe(401);
			const body = await response.json();
			expect(body.error).toBe("Authentication required");
		});

		it("returns 401 when authorization header is missing Bearer prefix", async () => {
			const req = mockRequest({
				headers: { authorization: "InvalidToken" },
				body: {
					requestId: randomUUID(),
					text: "Sample answer",
				},
			});

			const { POST } = await import("../../src/app/api/evaluate/route");
			const response = await POST(req);

			expect(response.status).toBe(401);
		});

		it("passes auth check with valid Bearer token", async () => {
			const req = mockRequest({
				headers: { authorization: "Bearer valid-token-123" },
				body: {
					requestId: randomUUID(),
					text: "Sample answer",
				},
			});

			// Mock dependencies
			vi.doMock("../../src/infrastructure/supabase/evaluation_store", () => ({
				getByRequestId: vi.fn().mockResolvedValue(null),
			}));

			vi.doMock("../../src/services/evaluation/enqueue", () => ({
				enqueueEvaluation: vi.fn().mockResolvedValue("job-123"),
			}));

			const { POST } = await import("../../src/app/api/evaluate/route");
			const response = await POST(req);

			// Should pass auth and proceed to validation/processing
			expect(response.status).not.toBe(401);
		});
	});

	describe("Validation", () => {
		it("rejects request with neither text nor audio_url", async () => {
			const req = mockRequest({
				headers: { authorization: "Bearer token" },
				body: {
					requestId: randomUUID(),
					// Missing both text and audio_url
				},
			});

			const { POST } = await import("../../src/app/api/evaluate/route");
			const response = await POST(req);

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error).toBe("Invalid request");
		});

		it("rejects request with invalid requestId format", async () => {
			const req = mockRequest({
				headers: { authorization: "Bearer token" },
				body: {
					requestId: "not-a-uuid",
					text: "Sample answer",
				},
			});

			const { POST } = await import("../../src/app/api/evaluate/route");
			const response = await POST(req);

			expect(response.status).toBe(400);
		});

		it("accepts valid request with text", async () => {
			const req = mockRequest({
				headers: { authorization: "Bearer token" },
				body: {
					requestId: randomUUID(),
					text: "Clear and concise answer",
				},
			});

			// Mock dependencies
			vi.doMock("../../src/infrastructure/supabase/evaluation_store", () => ({
				getByRequestId: vi.fn().mockResolvedValue(null),
			}));

			vi.doMock("../../src/services/evaluation/enqueue", () => ({
				enqueueEvaluation: vi.fn().mockResolvedValue("job-123"),
			}));

			const { POST } = await import("../../src/app/api/evaluate/route");
			const response = await POST(req);

			// Should pass validation
			expect(response.status).not.toBe(400);
		});

		it("accepts valid request with audio_url", async () => {
			const req = mockRequest({
				headers: { authorization: "Bearer token" },
				body: {
					requestId: randomUUID(),
					audio_url: "https://example.com/audio.mp3",
				},
			});

			// Mock dependencies
			vi.doMock("../../src/infrastructure/supabase/evaluation_store", () => ({
				getByRequestId: vi.fn().mockResolvedValue(null),
			}));

			vi.doMock("../../src/services/evaluation/enqueue", () => ({
				enqueueEvaluation: vi.fn().mockResolvedValue("job-123"),
			}));

			const { POST } = await import("../../src/app/api/evaluate/route");
			const response = await POST(req);

			// Should pass validation
			expect(response.status).not.toBe(400);
		});
	});

	describe("Idempotency", () => {
		it("returns existing result when requestId found in DB", async () => {
			const requestId = randomUUID();
			const existingResult = {
				requestId,
				jobId: "job-456",
				score: 85,
				feedback: "Good performance",
				what_changed: "Improved clarity",
				practice_rule: "Pause before answering",
				durationMs: 1200,
				tokensUsed: 300,
			};

			const req = mockRequest({
				headers: { authorization: "Bearer token" },
				body: {
					requestId,
					text: "Duplicate submission",
				},
			});

			// Mock getByRequestId to return existing result
			vi.doMock("../../src/infrastructure/supabase/evaluation_store", () => ({
				getByRequestId: vi.fn().mockResolvedValue(existingResult),
			}));

			const { POST } = await import("../../src/app/api/evaluate/route");
			const response = await POST(req);

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.status).toBe("completed");
			expect(body.result).toEqual(existingResult);
		});

		it("proceeds to enqueue when no existing result found", async () => {
			const requestId = randomUUID();

			const req = mockRequest({
				headers: { authorization: "Bearer token" },
				body: {
					requestId,
					text: "New submission",
				},
			});

			// Mock getByRequestId to return null (no existing result)
			vi.doMock("../../src/infrastructure/supabase/evaluation_store", () => ({
				getByRequestId: vi.fn().mockResolvedValue(null),
			}));

			const mockEnqueue = vi.fn().mockResolvedValue("job-789");
			vi.doMock("../../src/services/evaluation/enqueue", () => ({
				enqueueEvaluation: mockEnqueue,
			}));

			const { POST } = await import("../../src/app/api/evaluate/route");
			await POST(req);

			expect(mockEnqueue).toHaveBeenCalled();
		});
	});

	describe("Sync/Async Behavior", () => {
		it("returns 202 with jobId when job times out", async () => {
			const requestId = randomUUID();

			const req = mockRequest({
				headers: { authorization: "Bearer token" },
				body: {
					requestId,
					text: "Long running evaluation",
				},
			});

			// Mock to simulate timeout
			vi.doMock("../../src/infrastructure/supabase/evaluation_store", () => ({
				getByRequestId: vi.fn().mockResolvedValue(null),
			}));

			vi.doMock("../../src/services/evaluation/enqueue", () => ({
				enqueueEvaluation: vi.fn().mockResolvedValue("job-timeout"),
			}));

			// Mock evaluationQueue.getJob to return a job that times out
			vi.doMock("../../src/infrastructure/bullmq/queue", () => ({
				evaluationQueue: {
					getJob: vi.fn().mockResolvedValue({
						id: "job-timeout",
						waitUntilFinished: vi
							.fn()
							.mockRejectedValue(
								new Error(
									"Job wait evaluation timed out before finishing, no finish notification arrived after 30000ms",
								),
							),
					}),
					name: "evaluationQueue",
					opts: { connection: {} },
				},
			}));

			const { POST } = await import("../../src/app/api/evaluate/route");
			const response = await POST(req);

			expect(response.status).toBe(202);
			const body = await response.json();
			expect(body.status).toBe("queued");
			expect(body.jobId).toBe("job-timeout");
			expect(body.poll_url).toContain("/api/evaluate/status/");
		});

		it("returns 200 with result when job completes within timeout", async () => {
			const requestId = randomUUID();
			const completedResult = {
				requestId,
				jobId: "job-success",
				score: 90,
				feedback: "Excellent response",
				what_changed: "Clear communication",
				practice_rule: "Maintain pacing",
				durationMs: 800,
				tokensUsed: 250,
			};

			const req = mockRequest({
				headers: { authorization: "Bearer token" },
				body: {
					requestId,
					text: "Quick evaluation",
				},
			});

			// Mock to simulate successful completion
			let callCount = 0;
			vi.doMock("../../src/infrastructure/supabase/evaluation_store", () => ({
				getByRequestId: vi.fn().mockImplementation(() => {
					callCount++;
					// First call: no existing result (idempotency check)
					// Second call: result available after job completion
					return callCount === 1 ? null : completedResult;
				}),
			}));

			vi.doMock("../../src/services/evaluation/enqueue", () => ({
				enqueueEvaluation: vi.fn().mockResolvedValue("job-success"),
			}));

			vi.doMock("../../src/infrastructure/bullmq/queue", () => ({
				evaluationQueue: {
					getJob: vi.fn().mockResolvedValue({
						id: "job-success",
						waitUntilFinished: vi.fn().mockResolvedValue({ success: true }),
					}),
					name: "evaluationQueue",
					opts: { connection: {} },
				},
			}));

			const { POST } = await import("../../src/app/api/evaluate/route");
			const response = await POST(req);

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.status).toBe("completed");
			expect(body.result).toEqual(completedResult);
		});
	});
});
