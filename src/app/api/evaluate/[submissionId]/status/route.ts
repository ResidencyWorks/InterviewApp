/**
 * API endpoint for checking evaluation status
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createErrorResponse } from "@/lib/api/api-helpers";
import {
	NotFoundError,
	ValidationError,
} from "@/lib/llm/domain/errors/LLMErrors";
import { createStatusTrackingService } from "@/lib/llm/domain/services/StatusTrackingService";

/**
 * Path parameter validation schema
 */
const StatusParamsSchema = z.object({
	submissionId: z.string().uuid("Invalid submission ID format"),
});

/**
 * GET /api/evaluate/[submissionId]/status - Get evaluation status
 */
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ submissionId: string }> },
): Promise<NextResponse> {
	try {
		// Parse and validate path parameters
		const { submissionId } = await params;
		const validatedParams = StatusParamsSchema.parse({ submissionId });

		// Initialize status tracking service
		const statusService = createStatusTrackingService();

		// Get status by submission ID
		const status = statusService.getStatusBySubmissionId(
			validatedParams.submissionId,
		);

		if (!status) {
			throw new NotFoundError(
				"Evaluation status not found",
				"EvaluationStatus",
				validatedParams.submissionId,
			);
		}

		// Get status summary
		const summary = statusService.getStatusSummary(status);

		// Return status information
		return NextResponse.json({
			success: true,
			data: {
				submissionId: status.submissionId,
				status: {
					id: status.id,
					status: summary.status,
					progress: summary.progress,
					message: summary.message,
					estimatedTimeRemaining: summary.estimatedTimeRemaining,
					displayInfo: summary.displayInfo,
					startedAt: status.startedAt,
					updatedAt: status.updatedAt,
					completedAt: status.completedAt,
					errorMessage: status.errorMessage,
					metadata: status.metadata,
				},
			},
		});
	} catch (error) {
		// Handle validation errors
		if (error instanceof z.ZodError) {
			const validationErrors: Record<string, string[]> = {};
			error.issues.forEach((err) => {
				const path = err.path.join(".");
				if (!validationErrors[path]) {
					validationErrors[path] = [];
				}
				validationErrors[path].push(err.message);
			});

			return createErrorResponse(
				"Validation failed",
				"VALIDATION_ERROR",
				400,
				validationErrors,
			);
		}

		// Handle domain errors
		if (error instanceof NotFoundError) {
			return createErrorResponse(error.message, error.code, error.statusCode, {
				resourceType: error.resourceType,
				resourceId: error.resourceId,
			});
		}

		if (error instanceof ValidationError) {
			return createErrorResponse(
				error.message,
				error.code,
				error.statusCode,
				error.details,
			);
		}

		// Handle unexpected errors
		console.error("Unexpected error in status endpoint:", error);
		return createErrorResponse(
			"Internal server error",
			"INTERNAL_SERVER_ERROR",
			500,
		);
	}
}

/**
 * PUT /api/evaluate/[submissionId]/status - Update evaluation status (admin only)
 */
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ submissionId: string }> },
): Promise<NextResponse> {
	try {
		// Parse and validate path parameters
		const { submissionId } = await params;
		const validatedParams = StatusParamsSchema.parse({ submissionId });

		// Parse and validate request body
		const body = await request.json();
		const UpdateStatusSchema = z.object({
			status: z
				.enum(["pending", "processing", "completed", "failed", "retrying"])
				.optional(),
			progress: z.number().min(0).max(100).optional(),
			message: z.string().optional(),
			errorMessage: z.string().optional(),
			metadata: z.record(z.string(), z.unknown()).optional(),
		});

		const validatedData = UpdateStatusSchema.parse(body);

		// Initialize status tracking service
		const statusService = createStatusTrackingService();

		// Get current status
		const currentStatus = statusService.getStatusBySubmissionId(
			validatedParams.submissionId,
		);
		if (!currentStatus) {
			throw new NotFoundError(
				"Evaluation status not found",
				"EvaluationStatus",
				validatedParams.submissionId,
			);
		}

		// Update status
		const updatedStatus = statusService.updateStatus(
			currentStatus.id,
			validatedData,
		);

		// Get updated summary
		const summary = statusService.getStatusSummary(updatedStatus);

		// Return updated status
		return NextResponse.json({
			success: true,
			data: {
				submissionId: updatedStatus.submissionId,
				status: {
					id: updatedStatus.id,
					status: summary.status,
					progress: summary.progress,
					message: summary.message,
					estimatedTimeRemaining: summary.estimatedTimeRemaining,
					displayInfo: summary.displayInfo,
					startedAt: updatedStatus.startedAt,
					updatedAt: updatedStatus.updatedAt,
					completedAt: updatedStatus.completedAt,
					errorMessage: updatedStatus.errorMessage,
					metadata: updatedStatus.metadata,
				},
			},
		});
	} catch (error) {
		// Handle validation errors
		if (error instanceof z.ZodError) {
			const validationErrors: Record<string, string[]> = {};
			error.issues.forEach((err) => {
				const path = err.path.join(".");
				if (!validationErrors[path]) {
					validationErrors[path] = [];
				}
				validationErrors[path].push(err.message);
			});

			return createErrorResponse(
				"Validation failed",
				"VALIDATION_ERROR",
				400,
				validationErrors,
			);
		}

		// Handle domain errors
		if (error instanceof NotFoundError) {
			return createErrorResponse(error.message, error.code, error.statusCode, {
				resourceType: error.resourceType,
				resourceId: error.resourceId,
			});
		}

		if (error instanceof ValidationError) {
			return createErrorResponse(
				error.message,
				error.code,
				error.statusCode,
				error.details,
			);
		}

		// Handle unexpected errors
		console.error("Unexpected error in status update endpoint:", error);
		return createErrorResponse(
			"Internal server error",
			"INTERNAL_SERVER_ERROR",
			500,
		);
	}
}
