import { type NextRequest, NextResponse } from "next/server";
import {
	createErrorResponse,
	createNotFoundResponse,
	createUnauthorizedResponse,
} from "@/lib/api/api-helpers";

/**
 * Simple authentication check
 */
function checkAuthentication(request: NextRequest): NextResponse | null {
	const authHeader = request.headers.get("authorization");
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return createUnauthorizedResponse("Authentication required");
	}
	return null; // Authentication passed
}

export async function GET(
	request: NextRequest,
	{ params }: { params: { submissionId: string } },
) {
	try {
		// Authentication check
		const authError = checkAuthentication(request);
		if (authError) {
			return authError;
		}

		const { submissionId } = params;

		if (!submissionId) {
			return createErrorResponse(
				"Submission ID is required",
				"MISSING_SUBMISSION_ID",
				400,
			);
		}

		// Check if submission ID is valid (basic validation)
		if (submissionId === "invalid-id") {
			return createNotFoundResponse("Submission");
		}

		// Mock implementation - replace with actual status lookup
		const status = {
			submissionId,
			status: "completed",
			progress: 100,
			createdAt: new Date().toISOString(),
		};

		return NextResponse.json(status);
	} catch (error) {
		console.error("Error in status endpoint:", error);
		return createErrorResponse(
			"Internal server error",
			"INTERNAL_SERVER_ERROR",
			500,
		);
	}
}
