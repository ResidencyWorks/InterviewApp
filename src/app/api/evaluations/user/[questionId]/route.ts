import type { NextRequest } from "next/server";
import { createClient } from "@/infrastructure/supabase/server";
import {
	createErrorResponse,
	createSuccessResponse,
	createUnauthorizedResponse,
} from "@/presentation/api/api-helpers";

/**
 * GET /api/evaluations/user/[questionId]
 * Fetch all evaluation attempts by the authenticated user for a specific question
 */
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ questionId: string }> },
) {
	try {
		// Authentication
		const supabase = await createClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return createUnauthorizedResponse("Authentication required");
		}

		const { questionId } = await params;

		if (!questionId) {
			return createErrorResponse(
				"Question ID is required",
				"MISSING_QUESTION_ID",
				400,
			);
		}

		// Fetch all evaluation results for this user and question
		const { data: evaluations, error } = await supabase
			.from("evaluation_results")
			.select("*")
			.eq("user_id", user.id)
			.eq("question_id", questionId)
			.order("created_at", { ascending: false });

		if (error) {
			console.error("Error fetching user evaluations:", error);
			return createErrorResponse(
				"Failed to fetch evaluation history",
				"DATABASE_ERROR",
				500,
			);
		}

		// Get the best attempt (highest score)
		const bestAttempt =
			evaluations && evaluations.length > 0
				? evaluations.reduce((best, current) =>
						current.score > best.score ? current : best,
					)
				: null;

		return createSuccessResponse({
			attempts: evaluations || [],
			totalAttempts: evaluations?.length || 0,
			bestAttempt: bestAttempt,
			latestAttempt: evaluations?.[0] || null,
		});
	} catch (error) {
		console.error("Error in user evaluations endpoint:", error);
		return createErrorResponse(
			"Internal server error",
			"INTERNAL_SERVER_ERROR",
			500,
		);
	}
}
