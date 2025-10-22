/**
 * EvaluationStatus entity for tracking evaluation progress
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
 * Evaluation status entity schema
 */
export const EvaluationStatusEntitySchema = z.object({
	id: z.string().uuid("Invalid evaluation status ID format"),
	submissionId: z.string().uuid("Invalid submission ID format"),
	status: EvaluationStatusSchema,
	progress: z.number().min(0).max(100).default(0),
	message: z.string().optional(),
	startedAt: z.date(),
	updatedAt: z.date(),
	completedAt: z.date().optional(),
	errorMessage: z.string().optional(),
	metadata: z.record(z.string(), z.unknown()).optional(),
});

export type EvaluationStatusEntity = z.infer<
	typeof EvaluationStatusEntitySchema
>;

/**
 * Create a new evaluation status entity
 */
export function createEvaluationStatus(data: {
	id: string;
	submissionId: string;
	status: EvaluationStatus;
	progress?: number;
	message?: string;
	metadata?: Record<string, unknown>;
}): EvaluationStatusEntity {
	const now = new Date();

	const statusEntity: EvaluationStatusEntity = {
		id: data.id,
		submissionId: data.submissionId,
		status: data.status,
		progress: data.progress ?? 0,
		message: data.message,
		startedAt: now,
		updatedAt: now,
		metadata: data.metadata,
	};

	return EvaluationStatusEntitySchema.parse(statusEntity);
}

/**
 * Update evaluation status
 */
export function updateEvaluationStatus(
	statusEntity: EvaluationStatusEntity,
	updates: {
		status?: EvaluationStatus;
		progress?: number;
		message?: string;
		errorMessage?: string;
		metadata?: Record<string, unknown>;
	},
): EvaluationStatusEntity {
	const updated: EvaluationStatusEntity = {
		...statusEntity,
		...updates,
		updatedAt: new Date(),
		completedAt:
			updates.status === "completed" || updates.status === "failed"
				? new Date()
				: statusEntity.completedAt,
	};

	return EvaluationStatusEntitySchema.parse(updated);
}

/**
 * Validate evaluation status entity
 */
export function validateEvaluationStatus(
	data: unknown,
): EvaluationStatusEntity {
	return EvaluationStatusEntitySchema.parse(data);
}

/**
 * Check if status is terminal
 */
export function isTerminalStatus(status: EvaluationStatus): boolean {
	return status === "completed" || status === "failed";
}

/**
 * Check if status indicates processing
 */
export function isProcessingStatus(status: EvaluationStatus): boolean {
	return status === "processing" || status === "retrying";
}

/**
 * Get status display information
 */
export function getStatusDisplayInfo(status: EvaluationStatus): {
	label: string;
	color: "blue" | "yellow" | "green" | "red" | "gray";
	description: string;
	icon: string;
} {
	switch (status) {
		case "pending":
			return {
				label: "Pending",
				color: "blue",
				description: "Waiting to be processed",
				icon: "clock",
			};
		case "processing":
			return {
				label: "Processing",
				color: "yellow",
				description: "Currently being evaluated",
				icon: "loader",
			};
		case "completed":
			return {
				label: "Completed",
				color: "green",
				description: "Successfully completed",
				icon: "check-circle",
			};
		case "failed":
			return {
				label: "Failed",
				color: "red",
				description: "Failed after all retry attempts",
				icon: "x-circle",
			};
		case "retrying":
			return {
				label: "Retrying",
				color: "gray",
				description: "Retrying after failure",
				icon: "refresh-cw",
			};
		default:
			return {
				label: "Unknown",
				color: "gray",
				description: "Unknown status",
				icon: "help-circle",
			};
	}
}

/**
 * Calculate estimated time remaining based on progress
 */
export function calculateEstimatedTimeRemaining(
	statusEntity: EvaluationStatusEntity,
	baseProcessingTime: number = 5000, // 5 seconds base time
): number | null {
	if (statusEntity.progress === 0 || isTerminalStatus(statusEntity.status)) {
		return null;
	}

	const elapsed = Date.now() - statusEntity.startedAt.getTime();
	const estimatedTotal = (elapsed / statusEntity.progress) * 100;
	const remaining = Math.max(0, estimatedTotal - elapsed);

	return Math.round(remaining);
}

/**
 * Get progress message based on status and progress
 */
export function getProgressMessage(
	statusEntity: EvaluationStatusEntity,
): string {
	if (statusEntity.message) {
		return statusEntity.message;
	}

	switch (statusEntity.status) {
		case "pending":
			return "Your submission is queued for evaluation";
		case "processing":
			if (statusEntity.progress < 30) {
				return "Transcribing audio content...";
			} else if (statusEntity.progress < 70) {
				return "Analyzing your response...";
			} else {
				return "Generating feedback...";
			}
		case "retrying":
			return "Retrying evaluation after temporary issue";
		case "completed":
			return "Evaluation completed successfully";
		case "failed":
			return statusEntity.errorMessage || "Evaluation failed";
		default:
			return "Processing your submission";
	}
}
