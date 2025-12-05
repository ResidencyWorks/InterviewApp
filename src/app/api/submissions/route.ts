import type { NextRequest } from "next/server";
import { createClient } from "@/infrastructure/supabase/server";
import {
	createErrorResponse,
	createSuccessResponse,
	createUnauthorizedResponse,
} from "@/presentation/api/api-helpers";

/**
 * POST /api/submissions
 * Save a question submission immediately when user submits (before evaluation completes)
 */
export async function POST(request: NextRequest) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return createUnauthorizedResponse("Authentication required");
		}

		const body = await request.json();
		const {
			questionId,
			drillId,
			contentPackId,
			responseText,
			responseAudioUrl,
			responseType,
			evaluationJobId,
			evaluationRequestId,
		} = body;

		if (!questionId || !drillId || !responseType) {
			return createErrorResponse(
				"Missing required fields: questionId, drillId, responseType",
				"MISSING_FIELDS",
				400,
			);
		}

		// Upsert submission (update if exists, insert if new)
		const { data: submission, error } = await supabase
			.from("question_submissions")
			.upsert(
				{
					user_id: user.id,
					question_id: questionId,
					drill_id: drillId,
					content_pack_id: contentPackId,
					response_text: responseText,
					response_audio_url: responseAudioUrl,
					response_type: responseType,
					evaluation_job_id: evaluationJobId,
					evaluation_request_id: evaluationRequestId,
					evaluation_status: "pending",
					submitted_at: new Date().toISOString(),
				},
				{
					onConflict: "user_id,question_id,drill_id",
				},
			)
			.select()
			.single();

		if (error) {
			console.error("Error saving submission:", error);
			return createErrorResponse(
				"Failed to save submission",
				"DATABASE_ERROR",
				500,
			);
		}

		return createSuccessResponse({ submission });
	} catch (error) {
		console.error("Error in submissions endpoint:", error);
		return createErrorResponse(
			"Internal server error",
			"INTERNAL_SERVER_ERROR",
			500,
		);
	}
}

/**
 * GET /api/submissions?questionId=xxx&drillId=yyy
 * Get the user's submission for a specific question in a drill
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
		const questionId = searchParams.get("questionId");
		const drillId = searchParams.get("drillId");

		if (!questionId || !drillId) {
			return createErrorResponse(
				"Missing required parameters: questionId, drillId",
				"MISSING_PARAMETERS",
				400,
			);
		}

		const { data: submission, error } = await supabase
			.from("question_submissions")
			.select("*")
			.eq("user_id", user.id)
			.eq("question_id", questionId)
			.eq("drill_id", drillId)
			.single();

		if (error && error.code !== "PGRST116") {
			// PGRST116 = not found, which is OK
			console.error("Error fetching submission:", error);
			return createErrorResponse(
				"Failed to fetch submission",
				"DATABASE_ERROR",
				500,
			);
		}

		return createSuccessResponse({ submission: submission || null });
	} catch (error) {
		console.error("Error in submissions GET endpoint:", error);
		return createErrorResponse(
			"Internal server error",
			"INTERNAL_SERVER_ERROR",
			500,
		);
	}
}

/**
 * PATCH /api/submissions
 * Update a submission's evaluation status
 */
export async function PATCH(request: NextRequest) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return createUnauthorizedResponse("Authentication required");
		}

		const body = await request.json();
		const { submissionId, evaluation_status, evaluation_completed_at } = body;

		if (!submissionId) {
			return createErrorResponse(
				"Missing required field: submissionId",
				"MISSING_FIELDS",
				400,
			);
		}

		// Update the submission
		const updateData: Record<string, unknown> = {
			updated_at: new Date().toISOString(),
		};

		if (evaluation_status) {
			updateData.evaluation_status = evaluation_status;
		}

		if (evaluation_completed_at) {
			updateData.evaluation_completed_at = evaluation_completed_at;
		}

		const { data: submission, error } = await supabase
			.from("question_submissions")
			.update(updateData)
			.eq("id", submissionId)
			.eq("user_id", user.id) // Ensure user owns this submission
			.select()
			.single();

		if (error) {
			console.error("Error updating submission:", error);
			return createErrorResponse(
				"Failed to update submission",
				"DATABASE_ERROR",
				500,
			);
		}

		return createSuccessResponse({ submission });
	} catch (error) {
		console.error("Error in submissions PATCH endpoint:", error);
		return createErrorResponse(
			"Internal server error",
			"INTERNAL_SERVER_ERROR",
			500,
		);
	}
}
