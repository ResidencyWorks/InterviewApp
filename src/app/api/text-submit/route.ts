/**
 * Text Submit API Route
 * Handles POST requests for text-based responses as an alternative to audio recordings
 *
 * @file src/app/api/text-submit/route.ts
 */

import { type NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { validateUploadPermission } from "@/features/auth/application/entitlements/upload-permissions";
import { captureUploadError } from "@/features/booking/application/upload/errors";
import { PhiScrubber } from "@/shared/security/phi-scrubber";

/**
 * POST handler for text submission
 */
export async function POST(request: NextRequest) {
	try {
		// Parse JSON body
		const body = await request.json();
		const { text, sessionId, questionId, userId } = body;

		// Validate required fields
		if (!text || typeof text !== "string") {
			return NextResponse.json(
				{
					success: false,
					error: { code: "INVALID_INPUT", message: "Text content is required" },
				},
				{ status: 400 },
			);
		}

		// Validate text length (min 10, max 5000 characters)
		if (text.length < 10 || text.length > 5000) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "VALIDATION_ERROR",
						message: "Text must be between 10 and 5000 characters",
					},
				},
				{ status: 400 },
			);
		}

		if (!sessionId || !questionId) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "VALIDATION_ERROR",
						message: "Session ID and Question ID are required",
					},
				},
				{ status: 400 },
			);
		}

		// Validate user permission
		if (userId) {
			try {
				await validateUploadPermission(userId);
			} catch (_error) {
				return NextResponse.json(
					{
						success: false,
						error: {
							code: "PERMISSION_DENIED",
							message: "User does not have permission",
						},
					},
					{ status: 403 },
				);
			}
		}

		// Scrub PHI from text before processing
		const scrubbedText = PhiScrubber.scrubUserInput(text);

		// Generate response ID
		const responseId = uuidv4();

		// TODO: Store text response in database
		// For now, we'll just return success
		// In production, you would:
		// 1. Store the scrubbed text in a database table
		// 2. Link it to the recording metadata
		// 3. Handle it differently than audio recordings

		// Return success response
		return NextResponse.json({
			success: true,
			responseId,
			textLength: scrubbedText.length,
			submittedAt: new Date().toISOString(),
		});
	} catch (error) {
		// Capture error in Sentry
		captureUploadError(error, {});

		return NextResponse.json(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message:
						error instanceof Error ? error.message : "Internal server error",
				},
			},
			{ status: 500 },
		);
	}
}
