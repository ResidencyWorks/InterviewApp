/**
 * Signed URL API Route
 * Generates time-limited signed URLs for recording playback
 *
 * @file src/app/api/recordings/[recordingId]/signed-url/route.ts
 */

import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { generateSignedUrl } from "@/features/booking/infrastructure/storage/signed-url";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST handler for generating signed URLs
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ recordingId: string }> },
) {
	try {
		const { recordingId } = await params;

		if (!recordingId) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "INVALID_REQUEST",
						message: "Recording ID is required",
					},
				},
				{ status: 400 },
			);
		}

		// Get user ID from request (should be authenticated)
		const userId = request.headers.get("x-user-id");

		// Query recordings table to get storage path and verify ownership
		const { data: recording, error } = await supabase
			.from("recordings")
			.select("storage_path, user_id")
			.eq("id", recordingId)
			.single();

		if (error || !recording) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "NOT_FOUND",
						message: "Recording not found",
					},
				},
				{ status: 404 },
			);
		}

		// Verify user owns the recording (access control)
		if (userId && recording.user_id !== userId) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "PERMISSION_DENIED",
						message: "Access denied to this recording",
					},
				},
				{ status: 403 },
			);
		}

		// Parse optional expiry time from request body
		const body = await request.json().catch(() => ({}));
		const expiresIn = body.expiresIn || 900; // Default 15 minutes

		// Generate signed URL
		const result = await generateSignedUrl(recording.storage_path, expiresIn);

		if (!result.success || !result.data) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "GENERATION_ERROR",
						message: result.error || "Failed to generate signed URL",
					},
				},
				{ status: 500 },
			);
		}

		// Return signed URL with metadata
		return NextResponse.json({
			success: true,
			signedUrl: result.data.url,
			expiresAt: result.data.expiresAt.toISOString(),
			expiresIn: result.data.expiresIn,
		});
	} catch (error) {
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
