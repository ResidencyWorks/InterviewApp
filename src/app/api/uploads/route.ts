/**
 * Upload Queue API Route
 *
 * Handles upload queue management and status tracking.
 * Provides information about current and pending uploads.
 */

import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/infrastructure/supabase/server";

// In-memory upload queue (in production, this would be stored in Redis or database)
interface UploadItem {
	id: string;
	userId: string;
	fileName: string;
	fileSize: number;
	status: "queued" | "uploading" | "validating" | "completed" | "failed";
	progress: number;
	startedAt: Date;
	completedAt?: Date;
	error?: string;
	contentPackId?: string;
}

// Simple in-memory storage for demo purposes
// In production, this should be stored in Redis or a database
const uploadQueue: Map<string, UploadItem> = new Map();

/**
 * GET /api/uploads
 * Get upload queue status for the current user
 */
export async function GET(request: NextRequest) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json(
				{
					error: "UNAUTHORIZED",
					message: "Authentication required",
					timestamp: new Date().toISOString(),
				},
				{ status: 401 },
			);
		}

		// Check if user has admin role (PRO entitlement level)
		const { data: userData } = await supabase
			.from("users")
			.select("entitlement_level")
			.eq("id", user.id)
			.single();

		if (userData?.entitlement_level !== "PRO") {
			return NextResponse.json(
				{
					error: "FORBIDDEN",
					message: "Admin access required",
					timestamp: new Date().toISOString(),
				},
				{ status: 403 },
			);
		}

		const { searchParams } = new URL(request.url);
		const status = searchParams.get("status");
		const limit = parseInt(searchParams.get("limit") || "10", 10);

		// Get user's uploads
		const userUploads = Array.from(uploadQueue.values())
			.filter((upload) => upload.userId === user.id)
			.filter((upload) => !status || upload.status === status)
			.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
			.slice(0, limit);

		// Find current upload (if any)
		const currentUpload = userUploads.find(
			(upload) =>
				upload.status === "uploading" || upload.status === "validating",
		);

		return NextResponse.json({
			data: userUploads,
			currentUpload: currentUpload || null,
		});
	} catch (error) {
		console.error("Error getting upload queue:", error);
		return NextResponse.json(
			{
				error: "INTERNAL_SERVER_ERROR",
				message: "Failed to get upload queue",
				timestamp: new Date().toISOString(),
			},
			{ status: 500 },
		);
	}
}

/**
 * POST /api/uploads
 * Create a new upload item in the queue
 */
export async function POST(request: NextRequest) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json(
				{
					error: "UNAUTHORIZED",
					message: "Authentication required",
					timestamp: new Date().toISOString(),
				},
				{ status: 401 },
			);
		}

		// Check if user has admin role (PRO entitlement level)
		const { data: userData } = await supabase
			.from("users")
			.select("entitlement_level")
			.eq("id", user.id)
			.single();

		if (userData?.entitlement_level !== "PRO") {
			return NextResponse.json(
				{
					error: "FORBIDDEN",
					message: "Admin access required",
					timestamp: new Date().toISOString(),
				},
				{ status: 403 },
			);
		}

		const body = await request.json();
		const { fileName, fileSize } = body;

		if (!fileName || !fileSize) {
			return NextResponse.json(
				{
					error: "BAD_REQUEST",
					message: "File name and size are required",
					timestamp: new Date().toISOString(),
				},
				{ status: 400 },
			);
		}

		// Check if user already has an active upload
		const existingUpload = Array.from(uploadQueue.values()).find(
			(upload) =>
				upload.userId === user.id &&
				(upload.status === "uploading" || upload.status === "validating"),
		);

		if (existingUpload) {
			return NextResponse.json(
				{
					error: "CONFLICT",
					message: "User already has an active upload",
					timestamp: new Date().toISOString(),
				},
				{ status: 409 },
			);
		}

		// Create new upload item
		const uploadItem: UploadItem = {
			id: crypto.randomUUID(),
			userId: user.id,
			fileName,
			fileSize,
			status: "queued",
			progress: 0,
			startedAt: new Date(),
		};

		uploadQueue.set(uploadItem.id, uploadItem);

		return NextResponse.json(
			{
				data: uploadItem,
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("Error creating upload item:", error);
		return NextResponse.json(
			{
				error: "INTERNAL_SERVER_ERROR",
				message: "Failed to create upload item",
				timestamp: new Date().toISOString(),
			},
			{ status: 500 },
		);
	}
}

/**
 * Utility function to update upload status
 * This would be called by the upload processing logic
 */
export function updateUploadStatus(
	uploadId: string,
	status: UploadItem["status"],
	progress?: number,
	error?: string,
	contentPackId?: string,
) {
	const upload = uploadQueue.get(uploadId);
	if (upload) {
		upload.status = status;
		if (progress !== undefined) {
			upload.progress = progress;
		}
		if (error) {
			upload.error = error;
		}
		if (contentPackId) {
			upload.contentPackId = contentPackId;
		}
		if (status === "completed" || status === "failed") {
			upload.completedAt = new Date();
		}
		uploadQueue.set(uploadId, upload);
	}
}

/**
 * Utility function to get upload by ID
 */
export function getUploadById(uploadId: string): UploadItem | undefined {
	return uploadQueue.get(uploadId);
}
