/**
 * EvaluationRequest entity representing a request to evaluate a submission
 */

import { z } from "zod";

/**
 * Evaluation status enum
 */
export const EvaluationStatusSchema = z.enum([
	"pending",
	"processing",
	"completed",
	"failed",
	"retrying",
]);

export type EvaluationStatus = z.infer<typeof EvaluationStatusSchema>;

/**
 * Evaluation request schema for validation
 */
export const EvaluationRequestSchema = z.object({
	id: z.string().uuid("Invalid evaluation request ID format"),
	submissionId: z.string().uuid("Invalid submission ID format"),
	requestedAt: z.date(),
	retryCount: z.number().int().min(0, "Retry count must be non-negative"),
	status: EvaluationStatusSchema,
	errorMessage: z.string().optional(),
});

export type EvaluationRequest = z.infer<typeof EvaluationRequestSchema>;

/**
 * Create a new evaluation request
 */
export function createEvaluationRequest(data: {
	id: string;
	submissionId: string;
}): EvaluationRequest {
	const request: EvaluationRequest = {
		id: data.id,
		submissionId: data.submissionId,
		requestedAt: new Date(),
		retryCount: 0,
		status: "pending",
	};

	return EvaluationRequestSchema.parse(request);
}

/**
 * Validate evaluation request data
 */
export function validateEvaluationRequest(data: unknown): EvaluationRequest {
	return EvaluationRequestSchema.parse(data);
}

/**
 * Update evaluation request status
 */
export function updateEvaluationStatus(
	request: EvaluationRequest,
	status: EvaluationStatus,
	errorMessage?: string,
): EvaluationRequest {
	const updated: EvaluationRequest = {
		...request,
		status,
		errorMessage,
	};

	return EvaluationRequestSchema.parse(updated);
}

/**
 * Increment retry count
 */
export function incrementRetryCount(
	request: EvaluationRequest,
): EvaluationRequest {
	const updated: EvaluationRequest = {
		...request,
		retryCount: request.retryCount + 1,
		status: "retrying",
	};

	return EvaluationRequestSchema.parse(updated);
}

/**
 * Check if evaluation request is in a terminal state
 */
export function isTerminalStatus(status: EvaluationStatus): boolean {
	return status === "completed" || status === "failed";
}

/**
 * Check if evaluation request can be retried
 */
export function canRetry(
	request: EvaluationRequest,
	maxRetries: number,
): boolean {
	return !isTerminalStatus(request.status) && request.retryCount < maxRetries;
}

/**
 * Get status display information
 */
export function getStatusInfo(status: EvaluationStatus): {
	label: string;
	color: "blue" | "yellow" | "green" | "red" | "gray";
	description: string;
} {
	switch (status) {
		case "pending":
			return {
				label: "Pending",
				color: "blue",
				description: "Waiting to be processed",
			};
		case "processing":
			return {
				label: "Processing",
				color: "yellow",
				description: "Currently being evaluated",
			};
		case "completed":
			return {
				label: "Completed",
				color: "green",
				description: "Successfully completed",
			};
		case "failed":
			return {
				label: "Failed",
				color: "red",
				description: "Failed after all retry attempts",
			};
		case "retrying":
			return {
				label: "Retrying",
				color: "gray",
				description: "Retrying after failure",
			};
		default:
			return {
				label: "Unknown",
				color: "gray",
				description: "Unknown status",
			};
	}
}
