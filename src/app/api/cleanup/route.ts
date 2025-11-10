/**
 * Cleanup API Route
 * Endpoint for triggering manual cleanup of expired recordings
 * Can be called by scheduled jobs or cron
 *
 * @file src/app/api/cleanup/route.ts
 */

import { type NextRequest, NextResponse } from "next/server";
import { cleanupExpiredRecordings } from "@/features/booking/infrastructure/storage/lifecycle";

/**
 * POST handler for triggering cleanup
 */
export async function POST(_request: NextRequest) {
	try {
		// TODO: Add authentication/authorization check here
		// Only allow admin users or service accounts to trigger cleanup

		// Trigger cleanup
		const result = await cleanupExpiredRecordings();

		return NextResponse.json({
			success: result.success,
			deletedCount: result.deletedCount,
			totalExpired: result.expiredRecordings.length,
			errors: result.errors,
			timestamp: new Date().toISOString(),
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

/**
 * GET handler for cleanup status
 */
export async function GET() {
	return NextResponse.json({
		message: "Cleanup endpoint - use POST to trigger cleanup",
		endpoint: "/api/cleanup",
		method: "POST",
		description:
			"Triggers cleanup of expired recordings (older than 30 days). This endpoint should be secured and only accessible to admin users or scheduled jobs.",
	});
}
