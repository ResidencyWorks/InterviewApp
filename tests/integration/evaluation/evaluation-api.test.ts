import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/evaluate/route";

// Mock IORedis to prevent actual Redis connections
const mockRedisConnection = {
	on: vi.fn().mockReturnThis(),
	connect: vi.fn().mockResolvedValue(undefined),
	disconnect: vi.fn().mockResolvedValue(undefined),
	quit: vi.fn().mockResolvedValue(undefined),
	status: "ready",
};

vi.mock("ioredis", () => {
	return {
		default: vi.fn(() => mockRedisConnection),
	};
});

// Mock BullMQ Queue to prevent Redis connection
vi.mock("bullmq", () => {
	class MockQueueEvents {
		constructor(name: string, opts: any) {
			console.log("QueueEvents constructor called with:", name, opts);
		}
		async close() {
			return undefined;
		}
	}

	return {
		Queue: vi.fn(() => ({
			name: "evaluationQueue",
			getJob: vi.fn(),
			add: vi.fn(),
			close: vi.fn(),
			opts: { connection: mockRedisConnection },
		})),
		QueueEvents: MockQueueEvents,
	};
});

// Mock Supabase client
vi.mock("@/infrastructure/config/clients", () => ({
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
		})),
	})),
	createSupabaseServerClient: vi.fn(),
	createSupabaseBrowserClient: vi.fn(),
}));

// Mock evaluation store
vi.mock("@/infrastructure/supabase/evaluation_store", () => ({
	getByRequestId: vi.fn(),
	saveEvaluationResult: vi.fn(),
}));

// Mock enqueue service
vi.mock("@/services/evaluation/enqueue", () => ({
	enqueueEvaluation: vi.fn(),
}));

// Mock BullMQ queue
vi.mock("@/infrastructure/bullmq/queue", () => ({
	evaluationQueue: {
		getJob: vi.fn(),
		name: "evaluationQueue",
		opts: { connection: {} },
	},
	EVALUATION_QUEUE_NAME: "evaluationQueue",
}));

describe("/api/evaluate", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should evaluate text response successfully", async () => {
		const requestId = randomUUID();
		const mockEvaluationResult = {
			requestId,
			jobId: "job-test-123",
			score: 86,
			feedback: "Good performance",
			what_changed: "Add specific examples to support claims",
			practice_rule: "Expand your answer with specific examples and metrics",
			durationMs: 1500,
			tokensUsed: 300,
		};

		// Mock store and enqueue
		const { getByRequestId } = await import(
			"@/infrastructure/supabase/evaluation_store"
		);
		const { enqueueEvaluation } = await import("@/services/evaluation/enqueue");
		// First call returns null (no existing result), second call returns completed result
		let callCount = 0;
		vi.mocked(getByRequestId).mockImplementation(() => {
			callCount++;
			return Promise.resolve(callCount === 1 ? null : mockEvaluationResult);
		});
		vi.mocked(enqueueEvaluation).mockResolvedValue("job-test-123");

		const { evaluationQueue } = await import("@/infrastructure/bullmq/queue");

		const mockWaitUntilFinished = vi.fn(async (_queueEvents, _timeout) => {
			console.log("waitUntilFinished called with:", _queueEvents, _timeout);
			// Simulate successful job completion
			return undefined;
		});

		vi.mocked(evaluationQueue.getJob).mockImplementation(async (jobId) => {
			console.log("getJob called with:", jobId);
			return {
				id: jobId as string,
				waitUntilFinished: mockWaitUntilFinished,
			} as any;
		});
		const request = new NextRequest("http://localhost/api/evaluate", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				authorization: "Bearer test-token",
			},
			body: JSON.stringify({
				requestId,
				text: "This is a test response for evaluation",
			}),
		});

		const response = await POST(request);
		const data = await response.json();

		if (response.status !== 200) {
			console.log("Error response:", data);
		}

		expect(response.status).toBe(200);
		expect(data.status).toBe("completed");
		expect(data.result).toMatchObject({
			score: mockEvaluationResult.score,
			feedback: mockEvaluationResult.feedback,
		});
	});

	it("should evaluate audio response successfully", async () => {
		const requestId = randomUUID();
		const mockEvaluationResult = {
			requestId,
			jobId: "job-audio-123",
			score: 89,
			feedback: "Excellent audio response",
			what_changed: "Keep answers concise",
			practice_rule:
				"Keep answers concise: aim for 2 minutes max (200-300 words)",
			durationMs: 2100,
			tokensUsed: 320,
		};

		// Mock store and enqueue
		const { getByRequestId } = await import(
			"@/infrastructure/supabase/evaluation_store"
		);
		const { enqueueEvaluation } = await import("@/services/evaluation/enqueue");
		const { evaluationQueue } = await import("@/infrastructure/bullmq/queue");

		let callCount = 0;
		vi.mocked(getByRequestId).mockImplementation(() => {
			callCount++;
			return Promise.resolve(callCount === 1 ? null : mockEvaluationResult);
		});
		vi.mocked(enqueueEvaluation).mockResolvedValue("job-audio-123");
		vi.mocked(evaluationQueue.getJob).mockResolvedValue({
			id: "job-audio-123",
			waitUntilFinished: vi.fn().mockResolvedValue({ success: true }),
		} as any);

		const request = new NextRequest("http://localhost/api/evaluate", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				authorization: "Bearer test-token",
			},
			body: JSON.stringify({
				requestId,
				audio_url: "https://example.com/audio.mp3",
			}),
		});

		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.status).toBe("completed");
		expect(data.result.score).toBe(89);
	});

	it("should return 400 for missing transcript", async () => {
		const request = new NextRequest("http://localhost/api/evaluate", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				authorization: "Bearer test-token",
			},
			body: JSON.stringify({
				requestId: randomUUID(),
				// Missing both text and audio_url
			}),
		});

		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toBe("Invalid request");
	});

	it("should return 400 for empty transcript", async () => {
		const request = new NextRequest("http://localhost/api/evaluate", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				authorization: "Bearer test-token",
			},
			body: JSON.stringify({
				requestId: randomUUID(),
				text: "",
			}),
		});

		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toBe("Invalid request");
	});

	it("should handle evaluation service errors", async () => {
		const requestId = randomUUID();

		// Mock store to return an error scenario
		const { getByRequestId } = await import(
			"@/infrastructure/supabase/evaluation_store"
		);
		const { enqueueEvaluation } = await import("@/services/evaluation/enqueue");

		vi.mocked(getByRequestId).mockResolvedValue(null);
		vi.mocked(enqueueEvaluation).mockRejectedValue(
			new Error("Evaluation error"),
		);

		const request = new NextRequest("http://localhost/api/evaluate", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				authorization: "Bearer test-token",
			},
			body: JSON.stringify({
				requestId,
				text: "This is a test response",
			}),
		});

		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data.error).toBeDefined();
	});

	it("should handle malformed JSON", async () => {
		const request = new NextRequest("http://localhost/api/evaluate", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				authorization: "Bearer test-token",
			},
			body: "invalid json",
		});

		const response = await POST(request);

		// Next.js catches JSON parsing errors and returns 500
		expect([400, 500]).toContain(response.status);

		// Verify we can still get a response
		const data = await response.json();
		expect(data.error).toBeDefined();
	});

	it("should return evaluation result with all fields", async () => {
		const requestId = randomUUID();
		const mockEvaluationResult = {
			requestId,
			jobId: "job-fields-123",
			score: 81,
			feedback: "Good comprehensive response",
			what_changed: "Add specific examples to support claims",
			practice_rule: "Expand your answer with specific examples and metrics",
			durationMs: 1200,
			tokensUsed: 280,
		};

		// Mock store and enqueue
		const { getByRequestId } = await import(
			"@/infrastructure/supabase/evaluation_store"
		);
		const { enqueueEvaluation } = await import("@/services/evaluation/enqueue");
		const { evaluationQueue } = await import("@/infrastructure/bullmq/queue");

		let callCount = 0;
		vi.mocked(getByRequestId).mockImplementation(() => {
			callCount++;
			return Promise.resolve(callCount === 1 ? null : mockEvaluationResult);
		});
		vi.mocked(enqueueEvaluation).mockResolvedValue("job-fields-123");
		vi.mocked(evaluationQueue.getJob).mockResolvedValue({
			id: "job-fields-123",
			waitUntilFinished: vi.fn().mockResolvedValue({ success: true }),
		} as any);

		const request = new NextRequest("http://localhost/api/evaluate", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				authorization: "Bearer test-token",
			},
			body: JSON.stringify({
				requestId,
				text: "Test response",
			}),
		});

		const response = await POST(request);
		const data = await response.json();

		expect(data.result.score).toBe(81);
		expect(data.result.feedback).toBeDefined();
		expect(data.result.what_changed).toBeDefined();
		expect(data.result.practice_rule).toBeDefined();
	});

	it("should handle long transcript evaluation", async () => {
		const requestId = randomUUID();
		const mockEvaluationResult = {
			requestId,
			jobId: "job-long-123",
			score: 85,
			feedback: "Comprehensive long response",
			what_changed: "Keep answers concise",
			practice_rule:
				"Keep answers concise: aim for 2 minutes max (200-300 words)",
			durationMs: 3500,
			tokensUsed: 800,
		};

		// Mock store and enqueue
		const { getByRequestId } = await import(
			"@/infrastructure/supabase/evaluation_store"
		);
		const { enqueueEvaluation } = await import("@/services/evaluation/enqueue");
		const { evaluationQueue } = await import("@/infrastructure/bullmq/queue");

		let callCount = 0;
		vi.mocked(getByRequestId).mockImplementation(() => {
			callCount++;
			return Promise.resolve(callCount === 1 ? null : mockEvaluationResult);
		});
		vi.mocked(enqueueEvaluation).mockResolvedValue("job-long-123");
		vi.mocked(evaluationQueue.getJob).mockResolvedValue({
			id: "job-long-123",
			waitUntilFinished: vi.fn().mockResolvedValue({ success: true }),
		} as any);

		const longText = "This is a very long transcript. ".repeat(20);
		const request = new NextRequest("http://localhost/api/evaluate", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				authorization: "Bearer test-token",
			},
			body: JSON.stringify({
				requestId,
				text: longText,
			}),
		});

		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.result.score).toBe(85);
		expect(data.result.durationMs).toBeGreaterThan(1000);
	});
});
