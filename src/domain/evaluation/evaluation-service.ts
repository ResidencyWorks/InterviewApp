import { v4 as uuidv4 } from "uuid";
import { getServerAuthService } from "@/features/auth/application/services/server-auth-service";
import { analytics } from "@/features/notifications/application/analytics";
import { errorMonitoring } from "@/features/scheduling/infrastructure/monitoring/error-monitoring";
import { databaseService } from "@/infrastructure/db";
import { cacheKeys, cacheTTL, redisCache } from "@/infrastructure/redis";
import type { EvaluationRequest, EvaluationResult } from "@/types/evaluation";
import type {
	EvaluationMetrics,
	EvaluationServiceInterface,
} from "./evaluation-types";

/**
 * Evaluation service
 * Main service for handling evaluation operations
 */
export class EvaluationService implements EvaluationServiceInterface {
	/**
	 * Evaluate a response
	 * @param request - Evaluation request
	 * @returns Promise resolving to evaluation result
	 */
	async evaluate(request: EvaluationRequest): Promise<EvaluationResult> {
		const startTime = Date.now();
		const resultId = uuidv4();

		// Resolve user for analytics (available in both success and error paths)
		let currentUserId = "system";

		try {
			// Resolve user for analytics
			try {
				const auth = await getServerAuthService();
				const currentUser = await auth.getUser();
				currentUserId = currentUser?.id || "system";
			} catch {
				currentUserId = "system";
			}

			// Track evaluation started
			analytics.trackEvaluationStarted(currentUserId, request.content_pack_id);

			// Create evaluation result record
			const evaluationResult: EvaluationResult = {
				categories: {
					clarity: 0,
					content: 0,
					delivery: 0,
					structure: 0,
				},
				content_pack_id: request.content_pack_id,
				created_at: new Date().toISOString(),
				id: resultId,
				response_audio_url:
					request.type === "audio" ? request.audio_url : undefined,
				response_text: request.type === "text" ? request.response : undefined,
				response_type: request.type,
				status: "PROCESSING",
				updated_at: new Date().toISOString(),
				user_id: currentUserId,
			};

			// Save initial result
			await databaseService.insert("evaluation_results", evaluationResult);

			// Perform evaluation with user metadata
			const _evaluationRequest = {
				...request,
				metadata: { ...(request.metadata || {}), user_id: currentUserId },
			};

			// M0: For now, evaluation service is not implemented for the new engine
			// The simple evaluateTranscript function is used in the API route instead
			throw new Error(
				"EvaluationService.evaluate() is not yet implemented for M0. Use evaluateTranscript() in the API route instead.",
			);
			// const evaluation: EvaluationResponse =
			// 	await this.engine.evaluate(evaluationRequest);

			// Update result with evaluation data
			// const updatedResult: EvaluationResult = {
			// 	...evaluationResult,
			// 	categories: evaluation.categories,
			// 	duration_seconds: evaluation.duration,
			// 	feedback: evaluation.feedback,
			// 	score: evaluation.score,
			// 	status: "COMPLETED",
			// 	updated_at: new Date().toISOString(),
			// 	word_count: evaluation.word_count,
			// 	wpm: evaluation.wpm,
			// };

			// // Save updated result
			// await databaseService.update(
			// 	"evaluation_results",
			// 	resultId,
			// 	updatedResult,
			// );

			// // Cache the completed result
			// const cacheKey = cacheKeys.evaluationResult(resultId);
			// await redisCache.set(cacheKey, updatedResult, cacheTTL.evaluationResult);

			// // Track completion
			// analytics.trackEvaluationCompleted(
			// 	currentUserId,
			// 	{
			// 		categories: evaluation.categories as unknown as Record<
			// 			string,
			// 			number
			// 		>,
			// 		duration: evaluation.duration,
			// 		score: evaluation.score,
			// 		word_count: evaluation.word_count,
			// 	},
			// 	request.content_pack_id,
			// );

			// return updatedResult;
		} catch (error) {
			const duration = Date.now() - startTime;

			// Track failure
			analytics.trackEvaluationFailed(
				currentUserId,
				error instanceof Error ? error.message : "Unknown error",
				request.content_pack_id,
			);

			// Update result with error
			const errorResult: Partial<EvaluationResult> = {
				error_message: error instanceof Error ? error.message : "Unknown error",
				status: "FAILED",
				updated_at: new Date().toISOString(),
			};

			try {
				await databaseService.update(
					"evaluation_results",
					resultId,
					errorResult,
				);
			} catch (dbError) {
				console.error(
					"Failed to update evaluation result with error:",
					dbError,
				);
			}

			// Report error
			errorMonitoring.reportError({
				context: {
					action: "evaluate",
					component: "evaluation_service",
					metadata: {
						duration,
						requestType: request.type,
						resultId,
					},
				},
				error: error instanceof Error ? error : new Error("Unknown error"),
				message: "Evaluation service error",
			});

			throw error;
		}
	}

	/**
	 * Get evaluation result by ID
	 * @param id - Result ID
	 * @returns Promise resolving to evaluation result or null
	 */
	async getResult(id: string): Promise<EvaluationResult | null> {
		try {
			// Try cache first
			const cacheKey = cacheKeys.evaluationResult(id);
			const cachedResult = await redisCache.get<EvaluationResult>(cacheKey);

			if (cachedResult) {
				return cachedResult;
			}

			// Fallback to database
			const result = await databaseService.findById<EvaluationResult>(
				"evaluation_results",
				id,
			);

			if (result.data) {
				// Cache the result for future requests
				await redisCache.set(cacheKey, result.data, cacheTTL.evaluationResult);
			}

			return result.data;
		} catch (error) {
			console.error("Error getting evaluation result:", error);
			return null;
		}
	}

	/**
	 * List evaluation results for a user
	 * @param userId - User ID
	 * @param page - Page number
	 * @param limit - Results per page
	 * @returns Promise resolving to array of evaluation results
	 */
	async listResults(
		userId: string,
		page = 1,
		limit = 20,
	): Promise<EvaluationResult[]> {
		try {
			const result = await databaseService.paginate<EvaluationResult>(
				"evaluation_results",
				page,
				limit,
				{
					filters: { user_id: userId },
					orderBy: "created_at",
					orderDirection: "desc",
				},
			);

			return result.data?.data || [];
		} catch (error) {
			console.error("Error listing evaluation results:", error);
			return [];
		}
	}

	/**
	 * Delete evaluation result
	 * @param id - Result ID
	 */
	async deleteResult(id: string): Promise<void> {
		try {
			await databaseService.delete("evaluation_results", id);
		} catch (error) {
			console.error("Error deleting evaluation result:", error);
			throw error;
		}
	}

	/**
	 * Get evaluation analytics for a user
	 * @param userId - User ID
	 * @returns Promise resolving to analytics data
	 */
	async getAnalytics(userId: string): Promise<Record<string, unknown>> {
		try {
			const results = await this.listResults(userId, 1, 1000); // Get all results for analytics

			if (results.length === 0) {
				return {
					averageScore: 0,
					categoryAverages: {
						clarity: 0,
						content: 0,
						delivery: 0,
						structure: 0,
					},
					completionRate: 0,
					improvementTrends: {
						clarity: [],
						content: [],
						delivery: [],
						structure: [],
					},
					scoreDistribution: {},
					timeSpent: 0,
					totalEvaluations: 0,
				};
			}

			// Calculate analytics
			const totalEvaluations = results.length;
			const completedResults = results.filter((r) => r.status === "COMPLETED");
			const completionRate = (completedResults.length / totalEvaluations) * 100;

			const scores = completedResults.map((r) => r.score || 0);
			const averageScore =
				scores.length > 0
					? scores.reduce((sum, score) => sum + score, 0) / scores.length
					: 0;

			// Score distribution
			const scoreDistribution = {
				"0-20": 0,
				"21-40": 0,
				"41-60": 0,
				"61-80": 0,
				"81-100": 0,
			};

			for (const score of scores) {
				if (score <= 20) scoreDistribution["0-20"]++;
				else if (score <= 40) scoreDistribution["21-40"]++;
				else if (score <= 60) scoreDistribution["41-60"]++;
				else if (score <= 80) scoreDistribution["61-80"]++;
				else scoreDistribution["81-100"]++;
			}

			// Category averages
			const categoryAverages = {
				clarity: 0,
				content: 0,
				delivery: 0,
				structure: 0,
			};

			if (completedResults.length > 0) {
				const categorySums = completedResults.reduce(
					(acc, result) => ({
						clarity: acc.clarity + result.categories.clarity,
						content: acc.content + result.categories.content,
						delivery: acc.delivery + result.categories.delivery,
						structure: acc.structure + result.categories.structure,
					}),
					{ clarity: 0, content: 0, delivery: 0, structure: 0 },
				);

				categoryAverages.clarity =
					categorySums.clarity / completedResults.length;
				categoryAverages.structure =
					categorySums.structure / completedResults.length;
				categoryAverages.content =
					categorySums.content / completedResults.length;
				categoryAverages.delivery =
					categorySums.delivery / completedResults.length;
			}

			// Improvement trends (last 10 evaluations)
			const recentResults = completedResults.slice(-10);
			const improvementTrends = {
				clarity: recentResults.map((r) => r.categories.clarity),
				content: recentResults.map((r) => r.categories.content),
				delivery: recentResults.map((r) => r.categories.delivery),
				structure: recentResults.map((r) => r.categories.structure),
			};

			// Total time spent
			const timeSpent = completedResults.reduce((total, result) => {
				return total + (result.duration_seconds || 0);
			}, 0);

			return {
				averageScore: Math.round(averageScore * 100) / 100,
				categoryAverages: {
					clarity: Math.round(categoryAverages.clarity * 100) / 100,
					content: Math.round(categoryAverages.content * 100) / 100,
					delivery: Math.round(categoryAverages.delivery * 100) / 100,
					structure: Math.round(categoryAverages.structure * 100) / 100,
				},
				completionRate: Math.round(completionRate * 100) / 100,
				improvementTrends,
				scoreDistribution,
				timeSpent,
				totalEvaluations,
			};
		} catch (error) {
			console.error("Error getting evaluation analytics:", error);
			return {};
		}
	}

	/**
	 * Get evaluation metrics
	 * @returns Promise resolving to evaluation metrics
	 */
	async getMetrics(): Promise<EvaluationMetrics> {
		try {
			// This would typically come from a metrics store
			// For now, return mock metrics
			return {
				apiCalls: 0,
				cacheHits: 0,
				errors: 0,
				processingTime: 0,
				wordCount: 0,
			};
		} catch (error) {
			console.error("Error getting evaluation metrics:", error);
			return {
				apiCalls: 0,
				cacheHits: 0,
				errors: 1,
				processingTime: 0,
				wordCount: 0,
			};
		}
	}

	/**
	 * Health check for evaluation service
	 * @returns Promise resolving to health status
	 */
	async healthCheck(): Promise<{
		status: "healthy" | "unhealthy";
		error?: string;
	}> {
		// M0: Basic health check without engine
		return { status: "healthy" };
	}
}

// Export singleton instance
export const evaluationService = new EvaluationService();
