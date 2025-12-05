import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Unit tests for /api/evaluate route (T017)
 * Tests: validation, auth enforcement, idempotency, sync/async behavior
 */

// Mock IORedis to prevent actual Redis connections
vi.mock("ioredis", () => {
	const mockRedis = {
		on: vi.fn().mockReturnThis(),
		connect: vi.fn().mockResolvedValue(undefined),
		disconnect: vi.fn().mockResolvedValue(undefined),
		quit: vi.fn().mockResolvedValue(undefined),
	};
	return {
		default: vi.fn(() => mockRedis),
	};
});

// Mock BullMQ Queue to prevent Redis connection
vi.mock("bullmq", () => {
	class MockQueueEvents {
		close = vi.fn().mockResolvedValue(undefined);
	}

	return {
		Queue: vi.fn(function MockQueue() {
			return {
				name: "evaluationQueue",
				getJob: vi.fn(),
				add: vi.fn(),
				close: vi.fn(),
				opts: { connection: {} },
			};
		}),
		QueueEvents: MockQueueEvents,
	};
});

// Mock Supabase at the module level
vi.mock("../../src/infrastructure/config/clients", () => ({
	getSupabaseServiceRoleClient: vi.fn(() => ({
		from: vi.fn(() => ({
			select: vi.fn(() => ({
				eq: vi.fn(() => ({
					single: vi.fn(() => ({
						data: null,
						error: null,
					})),
				})),
			})),
			insert: vi.fn(() => ({
				select: vi.fn(() => ({
					single: vi.fn(() => ({
						data: {},
						error: null,
					})),
				})),
			})),
		})),
	})),
	createSupabaseServerClient: vi.fn(),
	createSupabaseBrowserClient: vi.fn(),
}));

// Mock Supabase server client (used by evaluate route)
// Store a reference to control auth behavior per test
const mockAuthBehavior = {
	shouldSucceed: true,
};
(globalThis as any).__mockAuthBehavior = mockAuthBehavior;

vi.mock("../../src/infrastructure/supabase/server", () => ({
	createClient: vi.fn(() => ({
		auth: {
			getUser: vi.fn(() => {
				const behavior = (globalThis as any).__mockAuthBehavior;
				if (behavior && !behavior.shouldSucceed) {
					return {
						data: { user: null },
						error: { message: "Invalid token" },
					};
				}
				return {
					data: { user: { id: "test-user-id", email: "test@example.com" } },
					error: null,
				};
			}),
		},
		from: vi.fn(() => ({
			select: vi.fn(() => ({
				eq: vi.fn(() => ({
					single: vi.fn(() => ({
						data: null,
						error: null,
					})),
				})),
			})),
		})),
	})),
}));

// Mock evaluation store
vi.mock("../../src/infrastructure/supabase/evaluation_store", () => ({
	getByRequestId: vi.fn(),
	saveEvaluationResult: vi.fn(),
}));

// Mock enqueue service
vi.mock("../../src/services/evaluation/enqueue", () => ({
	enqueueEvaluation: vi.fn(),
}));

// Mock BullMQ queue
vi.mock("../../src/infrastructure/bullmq/queue", () => ({
	evaluationQueue: {
		getJob: vi.fn(),
		name: "evaluationQueue",
		opts: { connection: {} },
	},
}));

describe("POST /api/evaluate", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset auth behavior to succeed by default
		const behavior = (globalThis as any).__mockAuthBehavior;
		if (behavior) {
			behavior.shouldSucceed = true;
		}
	});

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
			// Make auth fail for this test
			const behavior = (globalThis as any).__mockAuthBehavior;
			if (behavior) {
				behavior.shouldSucceed = false;
			}

			const req = mockRequest({
				body: {
					requestId: randomUUID(),
					text: "Sample answer",
				},
			});

			const { POST } = await import("../../src/app/api/evaluate/route");
			const response = await POST(req);

			expect(response.status).toBe(401);
			const body = await response.json();
			expect(body.error).toBe("Authentication required");
		});

		it("returns 401 when authorization header is missing Bearer prefix", async () => {
			// Make auth fail for this test
			const behavior = (globalThis as any).__mockAuthBehavior;
			if (behavior) {
				behavior.shouldSucceed = false;
			}

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
			const { getByRequestId } = await import(
				"../../src/infrastructure/supabase/evaluation_store"
			);
			const { enqueueEvaluation } = await import(
				"../../src/services/evaluation/enqueue"
			);
			const { evaluationQueue } = await import(
				"../../src/infrastructure/bullmq/queue"
			);

			vi.mocked(getByRequestId).mockResolvedValue(null);
			vi.mocked(enqueueEvaluation).mockResolvedValue("job-123");
			vi.mocked(evaluationQueue.getJob).mockResolvedValue(undefined);

			const req = mockRequest({
				headers: { authorization: "Bearer valid-token-123" },
				body: {
					requestId: randomUUID(),
					text: "Sample answer",
				},
			});
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
			const { getByRequestId } = await import(
				"../../src/infrastructure/supabase/evaluation_store"
			);
			const { enqueueEvaluation } = await import(
				"../../src/services/evaluation/enqueue"
			);
			const { evaluationQueue } = await import(
				"../../src/infrastructure/bullmq/queue"
			);

			vi.mocked(getByRequestId).mockResolvedValue(null);
			vi.mocked(enqueueEvaluation).mockResolvedValue("job-123");
			vi.mocked(evaluationQueue.getJob).mockResolvedValue(undefined);

			const req = mockRequest({
				headers: { authorization: "Bearer token" },
				body: {
					requestId: randomUUID(),
					text: "Clear and concise answer",
				},
			});
			const { POST } = await import("../../src/app/api/evaluate/route");
			const response = await POST(req);

			// Should pass validation
			expect(response.status).not.toBe(400);
		});

		it("accepts valid request with audio_url", async () => {
			const { getByRequestId } = await import(
				"../../src/infrastructure/supabase/evaluation_store"
			);
			const { enqueueEvaluation } = await import(
				"../../src/services/evaluation/enqueue"
			);
			const { evaluationQueue } = await import(
				"../../src/infrastructure/bullmq/queue"
			);

			vi.mocked(getByRequestId).mockResolvedValue(null);
			vi.mocked(enqueueEvaluation).mockResolvedValue("job-123");
			vi.mocked(evaluationQueue.getJob).mockResolvedValue(undefined);

			const req = mockRequest({
				headers: { authorization: "Bearer token" },
				body: {
					requestId: randomUUID(),
					audio_url: "https://example.com/audio.mp3",
				},
			});
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

			const { getByRequestId } = await import(
				"../../src/infrastructure/supabase/evaluation_store"
			);
			vi.mocked(getByRequestId).mockResolvedValue(existingResult);

			const req = mockRequest({
				headers: { authorization: "Bearer token" },
				body: {
					requestId,
					text: "Duplicate submission",
				},
			});

			const { POST } = await import("../../src/app/api/evaluate/route");
			const response = await POST(req);

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.status).toBe("completed");
			expect(body.result).toEqual(existingResult);
		});

		it("proceeds to enqueue when no existing result found", async () => {
			const requestId = randomUUID();

			const { getByRequestId } = await import(
				"../../src/infrastructure/supabase/evaluation_store"
			);
			const { enqueueEvaluation } = await import(
				"../../src/services/evaluation/enqueue"
			);
			const { evaluationQueue } = await import(
				"../../src/infrastructure/bullmq/queue"
			);

			vi.mocked(getByRequestId).mockResolvedValue(null);
			vi.mocked(enqueueEvaluation).mockResolvedValue("job-789");
			vi.mocked(evaluationQueue.getJob).mockResolvedValue(undefined);

			const req = mockRequest({
				headers: { authorization: "Bearer token" },
				body: {
					requestId,
					text: "New submission",
				},
			});
			const { POST } = await import("../../src/app/api/evaluate/route");
			await POST(req);

			expect(enqueueEvaluation).toHaveBeenCalled();
		});
	});

	describe("Sync/Async Behavior", () => {
		it("returns 202 with jobId when job times out", async () => {
			const requestId = randomUUID();

			const { getByRequestId } = await import(
				"../../src/infrastructure/supabase/evaluation_store"
			);
			const { enqueueEvaluation } = await import(
				"../../src/services/evaluation/enqueue"
			);
			const { evaluationQueue } = await import(
				"../../src/infrastructure/bullmq/queue"
			);

			vi.mocked(getByRequestId).mockResolvedValue(null);
			vi.mocked(enqueueEvaluation).mockResolvedValue("job-timeout");
			vi.mocked(evaluationQueue.getJob).mockResolvedValue({
				id: "job-timeout",
				waitUntilFinished: vi
					.fn()
					.mockRejectedValue(
						new Error(
							"Job wait evaluation timed out before finishing, no finish notification arrived after 30000ms",
						),
					),
			} as any);

			const req = mockRequest({
				headers: { authorization: "Bearer token" },
				body: {
					requestId,
					text: "Long running evaluation",
				},
			});

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

			const { getByRequestId } = await import(
				"../../src/infrastructure/supabase/evaluation_store"
			);
			const { enqueueEvaluation } = await import(
				"../../src/services/evaluation/enqueue"
			);
			const { evaluationQueue } = await import(
				"../../src/infrastructure/bullmq/queue"
			);

			let callCount = 0;
			vi.mocked(getByRequestId).mockImplementation(() => {
				callCount++;
				// First call: no existing result (idempotency check)
				// Second call: result available after job completion
				return Promise.resolve(callCount === 1 ? null : completedResult);
			});
			vi.mocked(enqueueEvaluation).mockResolvedValue("job-success");
			vi.mocked(evaluationQueue.getJob).mockResolvedValue({
				id: "job-success",
				waitUntilFinished: vi.fn().mockResolvedValue({ success: true }),
			} as any);

			const req = mockRequest({
				headers: { authorization: "Bearer token" },
				body: {
					requestId,
					text: "Quick evaluation",
				},
			});

			const { POST } = await import("../../src/app/api/evaluate/route");
			const response = await POST(req);

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.status).toBe("completed");
			expect(body.result).toEqual(completedResult);
		});
	});
});
