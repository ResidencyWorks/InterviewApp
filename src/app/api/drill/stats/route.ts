import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/infrastructure/supabase/server";
import {
	createErrorResponse,
	createSuccessResponse,
	createUnauthorizedResponse,
} from "@/presentation/api/api-helpers";

interface ContentPackQuestion {
	id: string;
	[key: string]: unknown;
}

interface ContentPackEvaluation {
	id: string;
	questions?: ContentPackQuestion[];
	[key: string]: unknown;
}

interface ContentPackContent {
	evaluations?: ContentPackEvaluation[];
	[key: string]: unknown;
}

/**
 * GET /api/drill/stats?drill_id=xxx
 * Get statistics for a completed drill (scores, attempts, time spent, etc.)
 */
export async function GET(request: NextRequest) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return createUnauthorizedResponse("Authentication required");
		}

		const { searchParams } = new URL(request.url);
		const drillId = searchParams.get("drill_id");

		if (!drillId) {
			return createErrorResponse(
				"Drill ID is required",
				"MISSING_DRILL_ID",
				400,
			);
		}

		try {
			// Get active content pack with its content
			const { data: activePack, error: packError } = await supabase
				.from("content_packs")
				.select("id, content")
				.eq("status", "activated")
				.single();

			if (packError || !activePack) {
				console.error("No active content pack found:", packError);
				// Return empty stats if no active pack
				return createSuccessResponse({
					stats: {
						totalAttempts: 0,
						bestScore: 0,
						averageScore: 0,
						worstScore: 0,
						totalTimeMinutes: 0,
						latestCompletion: null,
						scoreTrend: "insufficient_data",
						questionStats: {},
						recentScores: [],
					},
				});
			}

			// Extract question IDs for this specific drill/evaluation
			const content = activePack.content as ContentPackContent;
			const targetEvaluation = content?.evaluations?.find(
				(e) => e.id === drillId,
			);

			if (!targetEvaluation) {
				console.error("Evaluation not found in content pack:", drillId);
				return createSuccessResponse({
					stats: {
						totalAttempts: 0,
						bestScore: 0,
						averageScore: 0,
						worstScore: 0,
						totalTimeMinutes: 0,
						latestCompletion: null,
						scoreTrend: "insufficient_data",
						questionStats: {},
						recentScores: [],
					},
				});
			}

			const questionIds = targetEvaluation.questions?.map((q) => q.id) || [];

			if (questionIds.length === 0) {
				return createSuccessResponse({
					stats: {
						totalAttempts: 0,
						bestScore: 0,
						averageScore: 0,
						worstScore: 0,
						totalTimeMinutes: 0,
						latestCompletion: null,
						scoreTrend: "insufficient_data",
						questionStats: {},
						recentScores: [],
					},
				});
			}

			// Get evaluation results for these specific questions
			const { data: evaluations, error: evalError } = await supabase
				.from("evaluation_results")
				.select("*")
				.eq("user_id", user.id)
				.eq("content_pack_id", activePack.id)
				.in("question_id", questionIds)
				.order("created_at", { ascending: false });

			if (evalError) {
				throw new Error(`Failed to fetch evaluations: ${evalError.message}`);
			}

			// Calculate statistics
			const totalAttempts = evaluations?.length || 0;
			const scores = evaluations?.map((e) => e.score) || [];
			const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
			const averageScore =
				scores.length > 0
					? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
					: 0;
			const worstScore = scores.length > 0 ? Math.min(...scores) : 0;

			// Calculate total time spent (sum of duration_ms)
			const totalTimeMs =
				evaluations?.reduce((sum, e) => sum + (e.duration_ms || 0), 0) || 0;
			const totalTimeMinutes = Math.round(totalTimeMs / 1000 / 60);

			// Get latest completion date
			const latestCompletion = evaluations?.[0]?.created_at || null;

			// Calculate score trend (last 5 attempts)
			const recentScores = scores.slice(0, 5);
			const scoreTrend =
				recentScores.length >= 2
					? recentScores[0] > recentScores[recentScores.length - 1]
						? "improving"
						: recentScores[0] < recentScores[recentScores.length - 1]
							? "declining"
							: "stable"
					: "insufficient_data";

			// Get question-level statistics
			const questionStats: Record<
				string,
				{ attempts: number; bestScore: number; averageScore: number }
			> = {};

			evaluations?.forEach((evaluation) => {
				const questionId = evaluation.question_id;
				if (!questionStats[questionId]) {
					questionStats[questionId] = {
						attempts: 0,
						bestScore: 0,
						averageScore: 0,
					};
				}
				questionStats[questionId].attempts++;
				questionStats[questionId].bestScore = Math.max(
					questionStats[questionId].bestScore,
					evaluation.score,
				);
			});

			// Calculate average scores for each question
			Object.keys(questionStats).forEach((questionId) => {
				const questionEvals = evaluations?.filter(
					(e) => e.question_id === questionId,
				);
				const questionScores = questionEvals?.map((e) => e.score) || [];
				questionStats[questionId].averageScore =
					questionScores.length > 0
						? Math.round(
								questionScores.reduce((a, b) => a + b, 0) /
									questionScores.length,
							)
						: 0;
			});

			return createSuccessResponse({
				stats: {
					totalAttempts,
					bestScore,
					averageScore,
					worstScore,
					totalTimeMinutes,
					latestCompletion,
					scoreTrend,
					questionStats,
					recentScores: recentScores.slice(0, 5),
				},
			});
		} catch (error) {
			console.error("Error fetching drill stats:", error);
			return createErrorResponse(
				"Failed to fetch drill statistics",
				"INTERNAL_SERVER_ERROR",
				500,
			);
		}
	} catch (error) {
		console.error("Error in drill stats endpoint:", error);
		return createErrorResponse(
			"Internal server error",
			"INTERNAL_SERVER_ERROR",
			500,
		);
	}
}
