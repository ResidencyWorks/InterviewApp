/**
 * Status tracking service for managing evaluation status
 */

import type {
	EvaluationStatus,
	EvaluationStatusEntity,
} from "../entities/EvaluationStatus";
import {
	calculateEstimatedTimeRemaining,
	createEvaluationStatus,
	getProgressMessage,
	getStatusDisplayInfo,
	isTerminalStatus,
	updateEvaluationStatus,
} from "../entities/EvaluationStatus";
import { NotFoundError, ValidationError } from "../errors/LLMErrors";

/**
 * Status tracking service interface
 */
export interface IStatusTrackingService {
	/**
	 * Create initial status for a submission
	 */
	createStatus(
		submissionId: string,
		metadata?: Record<string, unknown>,
	): EvaluationStatusEntity;

	/**
	 * Update status with progress
	 */
	updateStatus(
		statusId: string,
		updates: {
			status?: EvaluationStatus;
			progress?: number;
			message?: string;
			errorMessage?: string;
			metadata?: Record<string, unknown>;
		},
	): EvaluationStatusEntity;

	/**
	 * Get status by ID
	 */
	getStatus(statusId: string): EvaluationStatusEntity | null;

	/**
	 * Get status by submission ID
	 */
	getStatusBySubmissionId(submissionId: string): EvaluationStatusEntity | null;

	/**
	 * Get all statuses for a user
	 */
	getStatusesByUserId(userId: string): EvaluationStatusEntity[];

	/**
	 * Clean up old completed statuses
	 */
	cleanupOldStatuses(olderThanDays: number): number;

	/**
	 * Get status summary
	 */
	getStatusSummary(status: EvaluationStatusEntity): {
		status: EvaluationStatus;
		progress: number;
		message: string;
		estimatedTimeRemaining: number | null;
		displayInfo: ReturnType<typeof getStatusDisplayInfo>;
	};
}

/**
 * In-memory status tracking service implementation
 * In a real application, this would use a database
 */
export class StatusTrackingService implements IStatusTrackingService {
	private statuses: Map<string, EvaluationStatusEntity> = new Map();
	private submissionToStatus: Map<string, string> = new Map();

	/**
	 * Create initial status for a submission
	 */
	createStatus(
		submissionId: string,
		metadata?: Record<string, unknown>,
	): EvaluationStatusEntity {
		// Check if status already exists for this submission
		const existingStatusId = this.submissionToStatus.get(submissionId);
		if (existingStatusId) {
			const existingStatus = this.statuses.get(existingStatusId);
			if (existingStatus && !isTerminalStatus(existingStatus.status)) {
				throw new ValidationError("Status already exists for this submission", {
					submissionId: ["Status tracking already exists for this submission"],
				});
			}
		}

		const statusId = this.generateId();
		const status = createEvaluationStatus({
			id: statusId,
			submissionId,
			status: "pending",
			progress: 0,
			message: "Submission received, queued for evaluation",
			metadata,
		});

		this.statuses.set(statusId, status);
		this.submissionToStatus.set(submissionId, statusId);

		return status;
	}

	/**
	 * Update status with progress
	 */
	updateStatus(
		statusId: string,
		updates: {
			status?: EvaluationStatus;
			progress?: number;
			message?: string;
			errorMessage?: string;
			metadata?: Record<string, unknown>;
		},
	): EvaluationStatusEntity {
		const existingStatus = this.statuses.get(statusId);
		if (!existingStatus) {
			throw new NotFoundError("Status not found", "EvaluationStatus", statusId);
		}

		// Validate progress range
		if (updates.progress !== undefined) {
			if (updates.progress < 0 || updates.progress > 100) {
				throw new ValidationError("Invalid progress value", {
					progress: ["Progress must be between 0 and 100"],
				});
			}
		}

		const updatedStatus = updateEvaluationStatus(existingStatus, updates);
		this.statuses.set(statusId, updatedStatus);

		return updatedStatus;
	}

	/**
	 * Get status by ID
	 */
	getStatus(statusId: string): EvaluationStatusEntity | null {
		return this.statuses.get(statusId) || null;
	}

	/**
	 * Get status by submission ID
	 */
	getStatusBySubmissionId(submissionId: string): EvaluationStatusEntity | null {
		const statusId = this.submissionToStatus.get(submissionId);
		if (!statusId) {
			return null;
		}

		return this.getStatus(statusId);
	}

	/**
	 * Get all statuses for a user
	 */
	getStatusesByUserId(_userId: string): EvaluationStatusEntity[] {
		// In a real implementation, you'd query by userId
		// For now, return all statuses (this is a limitation of the in-memory implementation)
		return Array.from(this.statuses.values());
	}

	/**
	 * Clean up old completed statuses
	 */
	cleanupOldStatuses(olderThanDays: number): number {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

		let cleanedCount = 0;
		const toDelete: string[] = [];

		for (const [statusId, status] of Array.from(this.statuses.entries())) {
			if (
				isTerminalStatus(status.status) &&
				status.completedAt &&
				status.completedAt < cutoffDate
			) {
				toDelete.push(statusId);
			}
		}

		for (const statusId of toDelete) {
			const status = this.statuses.get(statusId);
			if (status) {
				this.statuses.delete(statusId);
				this.submissionToStatus.delete(status.submissionId);
				cleanedCount++;
			}
		}

		return cleanedCount;
	}

	/**
	 * Get status summary
	 */
	getStatusSummary(status: EvaluationStatusEntity): {
		status: EvaluationStatus;
		progress: number;
		message: string;
		estimatedTimeRemaining: number | null;
		displayInfo: ReturnType<typeof getStatusDisplayInfo>;
	} {
		return {
			status: status.status,
			progress: status.progress,
			message: getProgressMessage(status),
			estimatedTimeRemaining: calculateEstimatedTimeRemaining(status),
			displayInfo: getStatusDisplayInfo(status.status),
		};
	}

	/**
	 * Get all statuses (for debugging/admin purposes)
	 */
	getAllStatuses(): EvaluationStatusEntity[] {
		return Array.from(this.statuses.values());
	}

	/**
	 * Get status statistics
	 */
	getStatusStatistics(): {
		total: number;
		byStatus: Record<EvaluationStatus, number>;
		averageProcessingTime: number;
	} {
		const statuses = Array.from(this.statuses.values());
		const byStatus: Record<EvaluationStatus, number> = {
			pending: 0,
			processing: 0,
			completed: 0,
			failed: 0,
			retrying: 0,
		};

		let totalProcessingTime = 0;
		let completedCount = 0;

		for (const status of statuses) {
			byStatus[status.status]++;

			if (status.completedAt && status.startedAt) {
				const processingTime =
					status.completedAt.getTime() - status.startedAt.getTime();
				totalProcessingTime += processingTime;
				completedCount++;
			}
		}

		return {
			total: statuses.length,
			byStatus,
			averageProcessingTime:
				completedCount > 0 ? totalProcessingTime / completedCount : 0,
		};
	}

	/**
	 * Generate unique ID
	 */
	private generateId(): string {
		// Use crypto.randomUUID() if available, otherwise fallback to timestamp + random
		if (typeof crypto !== "undefined" && crypto.randomUUID) {
			return crypto.randomUUID();
		}

		// Fallback for environments without crypto.randomUUID
		return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}
}

/**
 * Create status tracking service instance
 */
export function createStatusTrackingService(): IStatusTrackingService {
	return new StatusTrackingService();
}
