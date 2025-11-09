import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EvaluationService } from "@/domain/evaluation/evaluation-service";
import { analytics } from "@/features/notifications/application/analytics";
import { databaseService } from "@/infrastructure/db";
import { cacheKeys, redisCache } from "@/infrastructure/redis";
import type { EvaluationRequest, EvaluationResult } from "@/types/evaluation";

// Mock dependencies
vi.mock("@/infrastructure/db");
vi.mock("@/infrastructure/redis");
vi.mock("@/features/notifications/application/analytics");
vi.mock("@/domain/evaluation/evaluation-engine");

describe("EvaluationService", () => {
	let evaluationService: EvaluationService;
	let mockDatabaseService: any;
	let mockRedisCache: any;
	let mockAnalytics: any;

	beforeEach(() => {
		// Reset all mocks
		vi.clearAllMocks();

		// Setup mock implementations
		mockDatabaseService = {
			insert: vi.fn(),
			update: vi.fn(),
			findById: vi.fn(),
			paginate: vi.fn(),
		};

		mockRedisCache = {
			get: vi.fn(),
			set: vi.fn(),
			delete: vi.fn(),
		};

		mockAnalytics = {
			trackEvaluationStarted: vi.fn(),
			trackEvaluationCompleted: vi.fn(),
			trackEvaluationFailed: vi.fn(),
		};

		// Apply mocks
		vi.mocked(databaseService).insert = mockDatabaseService.insert;
		vi.mocked(databaseService).update = mockDatabaseService.update;
		vi.mocked(databaseService).findById = mockDatabaseService.findById;
		vi.mocked(databaseService).paginate = mockDatabaseService.paginate;

		vi.mocked(redisCache).get = mockRedisCache.get;
		vi.mocked(redisCache).set = mockRedisCache.set;
		vi.mocked(redisCache).delete = mockRedisCache.delete;

		// Mock cacheKeys - use vi.spyOn to mock the function
		vi.spyOn(cacheKeys, "evaluationResult").mockImplementation(
			(id: string) => `evaluation:${id}`,
		);

		vi.mocked(analytics).trackEvaluationStarted =
			mockAnalytics.trackEvaluationStarted;
		vi.mocked(analytics).trackEvaluationCompleted =
			mockAnalytics.trackEvaluationCompleted;
		vi.mocked(analytics).trackEvaluationFailed =
			mockAnalytics.trackEvaluationFailed;

		evaluationService = new EvaluationService();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("evaluate", () => {
		it.skip("should successfully evaluate a text response - not yet implemented", async () => {
			const request: EvaluationRequest = {
				response: "This is a test response for evaluation",
				type: "text",
				content_pack_id: "test-pack",
			};

			const mockEvaluationResult: EvaluationResult = {
				id: "test-id",
				user_id: "test-user",
				content_pack_id: "test-pack",
				response_text: request.response,
				response_type: "text",
				categories: {
					clarity: 85,
					content: 90,
					delivery: 80,
					structure: 88,
				},
				score: 86,
				feedback: "Good response with clear structure",
				status: "COMPLETED",
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			};

			mockDatabaseService.insert.mockResolvedValue({
				data: mockEvaluationResult,
			});
			mockDatabaseService.update.mockResolvedValue({
				data: mockEvaluationResult,
			});

			// Mock the evaluation engine
			const mockEngine = {
				evaluate: vi.fn().mockResolvedValue({
					categories: mockEvaluationResult.categories,
					score: mockEvaluationResult.score,
					feedback: mockEvaluationResult.feedback,
					duration: 1.5,
					word_count: 8,
					wpm: 320,
					timestamp: new Date().toISOString(),
				}),
			};

			// Replace the engine with our mock
			(evaluationService as any).engine = mockEngine;

			const result = await evaluationService.evaluate(request);

			expect(result).toBeDefined();
			expect(result.status).toBe("COMPLETED");
			expect(result.score).toBe(86);
			expect(mockDatabaseService.insert).toHaveBeenCalled();
			expect(mockDatabaseService.update).toHaveBeenCalled();
			expect(mockAnalytics.trackEvaluationStarted).toHaveBeenCalled();
			expect(mockAnalytics.trackEvaluationCompleted).toHaveBeenCalled();
		});

		it.skip("should handle evaluation errors gracefully - not yet implemented", async () => {
			const request: EvaluationRequest = {
				response: "Test response",
				type: "text",
				content_pack_id: "test-pack",
			};

			mockDatabaseService.insert.mockRejectedValue(new Error("Database error"));

			await expect(evaluationService.evaluate(request)).rejects.toThrow();
			expect(mockAnalytics.trackEvaluationFailed).toHaveBeenCalled();
		});
	});

	describe("getResult", () => {
		it("should return cached result when available", async () => {
			const resultId = "test-result-id";
			const mockResult: EvaluationResult = {
				id: resultId,
				user_id: "test-user",
				response_type: "text",
				categories: { clarity: 80, content: 85, delivery: 75, structure: 82 },
				score: 81,
				status: "COMPLETED",
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			};

			mockRedisCache.get.mockResolvedValue(mockResult);

			const result = await evaluationService.getResult(resultId);

			expect(result).toEqual(mockResult);
			expect(mockRedisCache.get).toHaveBeenCalledWith(`evaluation:${resultId}`);
			expect(mockDatabaseService.findById).not.toHaveBeenCalled();
		});

		it("should fallback to database when cache miss", async () => {
			const resultId = "test-result-id";
			const mockResult: EvaluationResult = {
				id: resultId,
				user_id: "test-user",
				response_type: "text",
				categories: { clarity: 80, content: 85, delivery: 75, structure: 82 },
				score: 81,
				status: "COMPLETED",
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			};

			mockRedisCache.get.mockResolvedValue(null);
			mockDatabaseService.findById.mockResolvedValue({ data: mockResult });

			const result = await evaluationService.getResult(resultId);

			expect(result).toEqual(mockResult);
			expect(mockRedisCache.get).toHaveBeenCalledWith(`evaluation:${resultId}`);
			expect(mockDatabaseService.findById).toHaveBeenCalledWith(
				"evaluation_results",
				resultId,
			);
			expect(mockRedisCache.set).toHaveBeenCalledWith(
				`evaluation:${resultId}`,
				mockResult,
				86400,
			);
		});

		it("should return null when result not found", async () => {
			const resultId = "non-existent-id";

			mockRedisCache.get.mockResolvedValue(null);
			mockDatabaseService.findById.mockResolvedValue({ data: null });

			const result = await evaluationService.getResult(resultId);

			expect(result).toBeNull();
		});
	});

	describe("listResults", () => {
		it("should return paginated results for a user", async () => {
			const userId = "test-user";
			const mockResults: EvaluationResult[] = [
				{
					id: "result-1",
					user_id: userId,
					response_type: "text",
					categories: { clarity: 80, content: 85, delivery: 75, structure: 82 },
					score: 81,
					status: "COMPLETED",
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				},
				{
					id: "result-2",
					user_id: userId,
					response_type: "audio",
					categories: { clarity: 85, content: 90, delivery: 88, structure: 87 },
					score: 88,
					status: "COMPLETED",
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				},
			];

			mockDatabaseService.paginate.mockResolvedValue({
				data: { data: mockResults },
			});

			const results = await evaluationService.listResults(userId, 1, 20);

			expect(results).toEqual(mockResults);
			expect(mockDatabaseService.paginate).toHaveBeenCalledWith(
				"evaluation_results",
				1,
				20,
				{
					filters: { user_id: userId },
					orderBy: "created_at",
					orderDirection: "desc",
				},
			);
		});
	});

	describe("getAnalytics", () => {
		it("should return analytics data for a user", async () => {
			const userId = "test-user";
			const mockResults = [
				{
					id: "result-1",
					user_id: userId,
					response_type: "text",
					categories: { clarity: 80, content: 85, delivery: 75, structure: 82 },
					score: 81,
					status: "COMPLETED",
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				},
				{
					id: "result-2",
					user_id: userId,
					response_type: "audio",
					categories: { clarity: 85, content: 90, delivery: 88, structure: 87 },
					score: 88,
					status: "COMPLETED",
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				},
			];

			// Mock the database service to return results for listResults
			mockDatabaseService.paginate.mockResolvedValue({
				data: { data: mockResults },
			});

			const result = await evaluationService.getAnalytics(userId);

			// The result should have calculated analytics based on the mock results
			expect(result).toHaveProperty("totalEvaluations");
			expect(result).toHaveProperty("averageScore");
			expect(result).toHaveProperty("categoryAverages");
			expect(result.totalEvaluations).toBe(2);
			expect(result.averageScore).toBe(84.5); // (81 + 88) / 2
		});
	});
});
