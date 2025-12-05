import type { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/infrastructure/supabase/server";
import {
	createErrorResponse,
	createSuccessResponse,
} from "@/presentation/api/api-helpers";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ questionId: string }> },
): Promise<NextResponse> {
	const supabase = await createClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		return createErrorResponse("Authentication required", "UNAUTHORIZED", 401);
	}

	try {
		const { questionId } = await params;
		const { searchParams } = new URL(request.url);
		const evaluationId = searchParams.get("evaluation");

		// Fetch the active content pack
		const { data: activePack, error } = await supabase
			.from("content_packs")
			.select("id, name, version, content")
			.eq("status", "activated")
			.single();

		if (error) {
			if (error.code === "PGRST116") {
				return createErrorResponse(
					"No active content pack found",
					"NO_ACTIVE_PACK",
					404,
				);
			}
			throw new Error(`Failed to fetch active content pack: ${error.message}`);
		}

		// Extract evaluations from the content pack
		const content = activePack.content as {
			evaluations?: Array<{
				id: string;
				title: string;
				description: string;
				criteria: Array<{
					id: string;
					name: string;
					weight: number;
					description: string;
				}>;
				questions: Array<{
					id: string;
					text: string;
					type: string;
				}>;
			}>;
		};

		const evaluations = content.evaluations || [];

		// Find the evaluation containing this question
		let targetEvaluation = evaluations.find((e) => e.id === evaluationId);
		if (!targetEvaluation) {
			// If no evaluation specified, search all evaluations
			targetEvaluation = evaluations.find((e) =>
				e.questions.some((q) => q.id === questionId),
			);
		}

		if (!targetEvaluation) {
			return createErrorResponse(
				"Evaluation not found",
				"EVALUATION_NOT_FOUND",
				404,
			);
		}

		// Find the specific question
		const question = targetEvaluation.questions.find(
			(q) => q.id === questionId,
		);

		if (!question) {
			return createErrorResponse(
				"Question not found",
				"QUESTION_NOT_FOUND",
				404,
			);
		}

		// Find question index for navigation
		const questionIndex = targetEvaluation.questions.findIndex(
			(q) => q.id === questionId,
		);
		const nextQuestion =
			questionIndex < targetEvaluation.questions.length - 1
				? targetEvaluation.questions[questionIndex + 1]
				: null;
		const prevQuestion =
			questionIndex > 0 ? targetEvaluation.questions[questionIndex - 1] : null;

		return createSuccessResponse({
			question: {
				...question,
				evaluationId: targetEvaluation.id,
				evaluationTitle: targetEvaluation.title,
				evaluationDescription: targetEvaluation.description,
			},
			evaluation: {
				id: targetEvaluation.id,
				title: targetEvaluation.title,
				description: targetEvaluation.description,
				totalQuestions: targetEvaluation.questions.length,
				currentQuestionIndex: questionIndex + 1,
			},
			navigation: {
				nextQuestionId: nextQuestion?.id || null,
				prevQuestionId: prevQuestion?.id || null,
				hasNext: nextQuestion != null,
				hasPrev: prevQuestion != null,
			},
			contentPack: {
				id: activePack.id,
				name: activePack.name,
				version: activePack.version,
			},
		});
	} catch (error) {
		console.error("Error fetching question:", error);
		return createErrorResponse(
			"Failed to fetch question",
			"INTERNAL_SERVER_ERROR",
			500,
		);
	}
}
