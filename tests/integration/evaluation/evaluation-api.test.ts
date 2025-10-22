import type { NextRequest } from "next/server";
import { createMocks } from "node-mocks-http";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/evaluate/route";

// Mock the evaluation service
vi.mock("@/lib/evaluation/evaluation-service", () => ({
	evaluationService: {
		evaluate: vi.fn(),
	},
}));

// Mock performance monitoring
vi.mock("@/lib/monitoring/performance", () => ({
	timeOperation: vi
		.fn()
		.mockImplementation(async (operation: string, fn: () => Promise<any>) => {
			const startTime = Date.now();
			const result = await fn();
			const endTime = Date.now();
			return {
				result,
				metrics: {
					duration: 150,
					operation,
					startTime,
					endTime,
					success: true,
				},
			};
		}),
}));

describe("/api/evaluate", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should evaluate text response successfully", async () => {
		const mockEvaluationResult = {
			id: "test-eval-1",
			user_id: "test-user",
			content_pack_id: "test-pack",
			response_text: "This is a test response for evaluation",
			response_type: "text" as const,
			duration_seconds: 1.5,
			word_count: 12,
			wpm: 480,
			categories: {
				clarity: 85,
				content: 90,
				delivery: 80,
				structure: 88,
			},
			score: 86,
			feedback: "Good response with clear structure and relevant content.",
			status: "COMPLETED" as const,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		// Mock the evaluation service
		const { evaluationService } = await import(
			"@/lib/evaluation/evaluation-service"
		);
		vi.mocked(evaluationService.evaluate).mockResolvedValue(
			mockEvaluationResult,
		);

		const { req } = createMocks<NextRequest>({
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({
				response: "This is a test response for evaluation",
				type: "text",
				content_pack_id: "test-pack",
			}) as any,
		});

		const response = await POST(req);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data).toMatchObject({
			categories: mockEvaluationResult.categories,
			score: mockEvaluationResult.score,
			feedback: mockEvaluationResult.feedback,
			performance: {
				duration: 150,
				operation: "api.evaluate",
				target: 250,
				targetMet: true,
			},
		});
	});

	it("should evaluate audio response successfully", async () => {
		const mockEvaluationResult = {
			id: "test-eval-2",
			user_id: "test-user",
			content_pack_id: "test-pack",
			response_audio_url: "https://example.com/audio.wav",
			response_type: "audio" as const,
			duration_seconds: 2.1,
			word_count: 15,
			wpm: 428,
			categories: {
				clarity: 88,
				content: 92,
				delivery: 85,
				structure: 90,
			},
			score: 89,
			feedback: "Excellent audio response with good pacing and clarity.",
			status: "COMPLETED" as const,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		// Mock the evaluation service
		const { evaluationService } = await import(
			"@/lib/evaluation/evaluation-service"
		);
		vi.mocked(evaluationService.evaluate).mockResolvedValue(
			mockEvaluationResult,
		);

		const { req } = createMocks<NextRequest>({
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({
				response: "Audio response content",
				type: "audio",
				audio_url: "https://example.com/audio.wav",
				content_pack_id: "test-pack",
			}) as any,
		});

		const response = await POST(req);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.score).toBe(89);
		expect(data.categories).toEqual(mockEvaluationResult.categories);
	});

	it("should return 400 for missing response", async () => {
		const { req } = createMocks<NextRequest>({
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({
				type: "text",
				content_pack_id: "test-pack",
			}) as any,
		});

		const response = await POST(req);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toBe("Response is required");
	});

	it("should return 400 for empty response", async () => {
		const { req } = createMocks<NextRequest>({
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({
				response: "",
				type: "text",
				content_pack_id: "test-pack",
			}) as any,
		});

		const response = await POST(req);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toBe("Response is required");
	});

	it("should handle evaluation service errors", async () => {
		// Mock the evaluation service to throw an error
		const { evaluationService } = await import(
			"@/lib/evaluation/evaluation-service"
		);
		vi.mocked(evaluationService.evaluate).mockRejectedValue(
			new Error("OpenAI API error"),
		);

		const { req } = createMocks<NextRequest>({
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({
				response: "This is a test response",
				type: "text",
				content_pack_id: "test-pack",
			}) as any,
		});

		const response = await POST(req);
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data.error).toBe("Internal server error");
	});

	it("should handle malformed JSON", async () => {
		const { req } = createMocks<NextRequest>({
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: "invalid json" as any,
		});

		const response = await POST(req);
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data.error).toBe("Internal server error");
	});

	it("should include performance metrics in response", async () => {
		const mockEvaluationResult = {
			id: "test-eval-3",
			user_id: "test-user",
			content_pack_id: "test-pack",
			response_text: "Test response",
			response_type: "text" as const,
			duration_seconds: 1.2,
			word_count: 8,
			wpm: 400,
			categories: { clarity: 80, content: 85, delivery: 75, structure: 82 },
			score: 81,
			feedback: "Good response",
			status: "COMPLETED" as const,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		// Mock the evaluation service
		const { evaluationService } = await import(
			"@/lib/evaluation/evaluation-service"
		);
		vi.mocked(evaluationService.evaluate).mockResolvedValue(
			mockEvaluationResult,
		);

		const { req } = createMocks<NextRequest>({
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({
				response: "Test response",
				type: "text",
				content_pack_id: "test-pack",
			}) as any,
		});

		const response = await POST(req);
		const data = await response.json();

		expect(data.performance).toBeDefined();
		expect(data.performance.duration).toBe(150);
		expect(data.performance.operation).toBe("api.evaluate");
		expect(data.performance.target).toBe(250);
		expect(data.performance.targetMet).toBe(true);
	});

	it("should handle performance target exceeded", async () => {
		// Mock performance monitoring to return slow response
		const { timeOperation } = await import("@/lib/monitoring/performance");
		vi.mocked(timeOperation).mockImplementation(
			async (operation: string, fn: () => Promise<any>) => {
				const startTime = Date.now();
				const result = await fn();
				const endTime = Date.now();
				return {
					result,
					metrics: {
						duration: 300, // Exceeds 250ms target
						operation,
						startTime,
						endTime,
						success: true,
					},
				};
			},
		);

		const mockEvaluationResult = {
			id: "test-eval-4",
			user_id: "test-user",
			content_pack_id: "test-pack",
			response_text: "Test response",
			response_type: "text" as const,
			duration_seconds: 1.2,
			word_count: 8,
			wpm: 400,
			categories: { clarity: 80, content: 85, delivery: 75, structure: 82 },
			score: 81,
			feedback: "Good response",
			status: "COMPLETED" as const,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		// Mock the evaluation service
		const { evaluationService } = await import(
			"@/lib/evaluation/evaluation-service"
		);
		vi.mocked(evaluationService.evaluate).mockResolvedValue(
			mockEvaluationResult,
		);

		const { req } = createMocks<NextRequest>({
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({
				response: "Test response",
				type: "text",
				content_pack_id: "test-pack",
			}) as any,
		});

		const response = await POST(req);
		const data = await response.json();

		expect(data.performance.targetMet).toBe(false);
		expect(data.performance.duration).toBe(300);
	});
});
