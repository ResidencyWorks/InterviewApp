/**
 * Submit Text Response API Route
 * Handles POST requests for submitting text responses
 *
 * @file src/app/api/submit-text/route.ts
 */

import { type NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { validateUploadPermission } from "@/features/auth/application/entitlements/upload-permissions";
import { validateTextSubmissionRequest } from "@/features/booking/application/upload/schemas";
import { getSupabaseServiceRoleClient } from "@/infrastructure/config/clients";
import { PhiScrubber } from "@/shared/security/phi-scrubber";

/**
 * POST handler for text submission
 */
export async function POST(request: NextRequest) {
	try {
		// Parse request body
		const body = await request.json();
		const { textContent, sessionId, questionId, userId } = body;

		// Validate request
		const validation = validateTextSubmissionRequest({
			textContent,
			sessionId,
			questionId,
			userId,
		});

		if (!validation.valid || !validation.data) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "VALIDATION_ERROR",
						message: validation.error || "Invalid request",
					},
				},
				{ status: 400 },
			);
		}

		const { data: validatedData } = validation;

		if (!validatedData.userId) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "MISSING_USER",
						message: "userId is required to submit text",
					},
				},
				{ status: 400 },
			);
		}

		// Validate user permission
		if (validatedData.userId) {
			try {
				await validateUploadPermission(validatedData.userId);
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

		const supabase = getSupabaseServiceRoleClient();
		if (!supabase) {
			console.error("Supabase service role client not configured");
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "CONFIGURATION_ERROR",
						message: "Service configuration missing",
					},
				},
				{ status: 500 },
			);
		}

		// Generate recording ID
		const recordingId = uuidv4();
		const now = new Date();
		const recordedAt = now.toISOString();
		const uploadedAt = now.toISOString();
		const expiresAt = new Date(now);
		expiresAt.setDate(expiresAt.getDate() + 30);
		const expiresAtIso = expiresAt.toISOString();

		// Scrub PHI from textContent before database insert
		const scrubbedTextContent = PhiScrubber.scrubUserInput(
			validatedData.textContent,
		);

		// Create recording record in database
		const { error: dbError } = await supabase.from("recordings").insert({
			id: recordingId,
			user_id: validatedData.userId,
			session_id: validatedData.sessionId ?? null,
			question_id: validatedData.questionId ?? null,
			response_type: "text",
			text_content: scrubbedTextContent,
			file_name: null,
			mime_type: null,
			file_size: null,
			duration: null,
			storage_path: null,
			recorded_at: recordedAt,
			uploaded_at: uploadedAt,
			expires_at: expiresAtIso,
			status: "completed",
			upload_attempts: 1,
			upload_duration_ms: 0,
		});

		if (dbError) {
			console.error("Database insert error:", dbError);
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "DATABASE_ERROR",
						message: "Failed to store text response",
					},
				},
				{ status: 500 },
			);
		}

		return NextResponse.json({
			success: true,
			data: {
				recordingId,
				status: "completed",
				textLength: scrubbedTextContent.length,
			},
		});
	} catch (error) {
		console.error("Text submission error:", error);
		return NextResponse.json(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message:
						error instanceof Error ? error.message : "Text submission failed",
				},
			},
			{ status: 500 },
		);
	}
}
