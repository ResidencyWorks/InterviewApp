/**
 * Upload API Route
 * Handles POST requests for uploading audio recordings
 *
 * @file src/app/api/upload/route.ts
 */

import { type NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { uploadFile } from "@/lib/storage/supabase-storage";
import { captureUploadError } from "@/lib/upload/errors";
import { validateUploadRequest } from "@/lib/upload/schemas";
import { createRecording } from "@/models/recording";
import { validateUploadPermission } from "@/services/entitlement";

/**
 * POST handler for audio upload
 */
export async function POST(request: NextRequest) {
	try {
		// Parse form data
		const formData = await request.formData();
		const file = formData.get("file") as File;

		if (!file) {
			return NextResponse.json(
				{
					success: false,
					error: { code: "INVALID_FILE", message: "No file provided" },
				},
				{ status: 400 },
			);
		}

		// Extract metadata
		const sessionId = formData.get("sessionId") as string;
		const questionId = formData.get("questionId") as string;
		const duration = parseInt(formData.get("duration") as string, 10);
		const userId = formData.get("userId") as string;

		// Validate request
		const validation = validateUploadRequest({
			file,
			sessionId,
			questionId,
			duration,
			userId,
		});

		if (!validation.valid || !validation.data) {
			return NextResponse.json(
				{
					success: false,
					error: { code: "VALIDATION_ERROR", message: validation.error },
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

		// Generate recording ID and storage path
		const recordingId = uuidv4();
		const fileName = `${recordingId}.${file.name.split(".").pop()}`;
		const storagePath = userId ? `${userId}/${fileName}` : fileName;

		// Upload file to storage
		const uploadResult = await uploadFile(file, storagePath);

		if (!uploadResult.success) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "UPLOAD_ERROR",
						message: uploadResult.error || "Upload failed",
					},
				},
				{ status: 500 },
			);
		}

		// Create recording metadata
		const recording = createRecording({
			id: recordingId,
			userId: userId || "anonymous",
			sessionId,
			questionId,
			responseType: "audio",
			fileName,
			mimeType: file.type,
			fileSize: file.size,
			duration,
			storagePath,
			recordedAt: new Date(),
		});

		// Return success response
		return NextResponse.json({
			success: true,
			recordingId,
			status: recording.status,
			fileSize: file.size,
			duration: recording.duration,
			uploadDuration: 0, // TODO: Calculate from start time
			uploadAttempts: 0,
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
