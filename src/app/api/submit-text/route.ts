/**
 * Submit Text Response API Route
 * Handles POST requests for submitting text responses
 *
 * @file src/app/api/submit-text/route.ts
 */

import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { validateTextSubmissionRequest } from "@/features/booking/application/upload/schemas";
import { createRecording } from "@/models/recording";
import { validateUploadPermission } from "@/services/entitlement";

/**
 * Create Supabase client for database operations
 */
const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

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

		// Generate recording ID
		const recordingId = uuidv4();
		const now = new Date();
		const expiresAt = new Date(now);
		expiresAt.setDate(expiresAt.getDate() + 30);

		// Create recording record in database
		const { error: dbError } = await supabase.from("recordings").insert({
			id: recordingId,
			user_id: validatedData.userId,
			session_id: validatedData.sessionId,
			question_id: validatedData.questionId,
			response_type: "text",
			text_content: validatedData.textContent,
			file_name: null,
			mime_type: null,
			file_size: null,
			duration: null,
			storage_path: null,
			recorded_at: now,
			uploaded_at: now,
			expires_at: expiresAt,
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
				textLength: validatedData.textContent.length,
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
