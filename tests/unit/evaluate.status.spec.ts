import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { GET } from "../../src/app/api/evaluate/status/[jobId]/route";

// Mock dependencies
vi.mock("../../src/infrastructure/supabase/evaluation_store", () => ({
	getByRequestId: vi.fn(),
	getByJobId: vi.fn(),
}));

vi.mock("../../src/infrastructure/bullmq/queue", () => ({
	evaluationQueue: {
		getJob: vi.fn(),
	},
}));

import { evaluationQueue } from "../../src/infrastructure/bullmq/queue";
import {
	getByJobId,
	getByRequestId,
} from "../../src/infrastructure/supabase/evaluation_store";

describe("GET /api/evaluate/status/[jobId]", () => {
	it("returns 404 if job not found in queue or DB", async () => {
		// getJob should resolve to undefined when not found (rather than null) to satisfy TS type
		vi.mocked(evaluationQueue.getJob).mockResolvedValue(undefined);
		vi.mocked(getByRequestId).mockResolvedValue(null);
		vi.mocked(getByJobId).mockResolvedValue(null);

		const req = new NextRequest(
			"http://localhost/api/evaluate/status/eval:123",
		);
		const res = await GET(req, { params: { jobId: "eval:123" } });

		expect(res.status).toBe(404);
	});

	it("returns completed result from DB if available", async () => {
		vi.mocked(evaluationQueue.getJob).mockResolvedValue({
			data: { requestId: "uuid-123" },
			isFailed: vi.fn().mockResolvedValue(false),
			isCompleted: vi.fn().mockResolvedValue(true),
			isActive: vi.fn().mockResolvedValue(false),
		} as any);

		vi.mocked(getByJobId).mockResolvedValue({
			requestId: "uuid-123",
			jobId: "eval:123",
			score: 90,
			feedback: "Good",
			what_changed: "None",
			practice_rule: "None",
			durationMs: 1000,
		});

		const req = new NextRequest(
			"http://localhost/api/evaluate/status/eval:123",
		);
		const res = await GET(req, { params: { jobId: "eval:123" } });
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.status).toBe("completed");
		expect(body.result.score).toBe(90);
		expect(body.poll_after_ms).toBe(0);
	});

	it("returns queue status if job is active/waiting", async () => {
		vi.mocked(getByJobId).mockResolvedValue(null);
		vi.mocked(evaluationQueue.getJob).mockResolvedValue({
			id: "eval:123",
			data: { requestId: "uuid-123" },
			isActive: () => Promise.resolve(true),
			isFailed: () => Promise.resolve(false),
			isCompleted: () => Promise.resolve(false),
			failedReason: undefined,
		} as any);

		const req = new NextRequest(
			"http://localhost/api/evaluate/status/eval:123",
		);
		const res = await GET(req, { params: { jobId: "eval:123" } });
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.status).toBe("processing");
		expect(body.poll_after_ms).toBe(3000);
	});

	it("returns failed status if job failed", async () => {
		vi.mocked(getByJobId).mockResolvedValue(null);
		vi.mocked(evaluationQueue.getJob).mockResolvedValue({
			id: "eval:123",
			data: { requestId: "uuid-123" },
			isActive: () => Promise.resolve(false),
			isFailed: () => Promise.resolve(true),
			isCompleted: () => Promise.resolve(false),
			failedReason: "Some error",
		} as any);

		const req = new NextRequest(
			"http://localhost/api/evaluate/status/eval:123",
		);
		const res = await GET(req, { params: { jobId: "eval:123" } });
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.status).toBe("failed");
		expect(body.error.message).toBe("Some error");
		expect(body.poll_after_ms).toBe(0);
	});
});
