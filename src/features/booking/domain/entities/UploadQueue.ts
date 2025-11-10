/**
 * UploadQueue entity representing the queue management system for handling concurrent content pack uploads
 *
 * @fileoverview Domain entity for managing upload queue state
 */

export interface UploadQueue {
	id: string; // Queue instance ID
	currentUpload?: UploadItem; // Currently processing upload
	pendingUploads: UploadItem[]; // Queue of pending uploads
	completedUploads: UploadItem[]; // Recently completed uploads
	maxConcurrentUploads: number; // Maximum concurrent uploads (always 1)
	createdAt: Date; // Queue creation time
	updatedAt: Date; // Last queue update
}

export interface UploadItem {
	id: string; // Upload item ID
	userId: string; // User who initiated upload
	fileName: string; // Original file name
	fileSize: number; // File size in bytes
	status: UploadStatus; // Current upload status
	progress: number; // Upload progress (0-100)
	startedAt: Date; // When upload started
	completedAt?: Date; // When upload completed
	error?: string; // Error message if failed
	contentPackId?: string; // Associated content pack ID
}

export enum UploadStatus {
	QUEUED = "queued", // Waiting in queue
	UPLOADING = "uploading", // Currently uploading
	VALIDATING = "validating", // Currently validating
	COMPLETED = "completed", // Successfully completed
	FAILED = "failed", // Upload or validation failed
}

/**
 * Factory function to create an UploadQueue
 * @param id - Queue ID
 * @param maxConcurrentUploads - Maximum concurrent uploads (default: 1)
 * @returns UploadQueue instance
 */
export function createUploadQueue(
	id: string,
	maxConcurrentUploads = 1,
): UploadQueue {
	const now = new Date();
	return {
		id,
		currentUpload: undefined,
		pendingUploads: [],
		completedUploads: [],
		maxConcurrentUploads,
		createdAt: now,
		updatedAt: now,
	};
}

/**
 * Factory function to create an UploadItem
 * @param params - Upload item parameters
 * @returns UploadItem instance
 */
export function createUploadItem(params: {
	id: string;
	userId: string;
	fileName: string;
	fileSize: number;
	contentPackId?: string;
}): UploadItem {
	const now = new Date();
	return {
		id: params.id,
		userId: params.userId,
		fileName: params.fileName,
		fileSize: params.fileSize,
		status: UploadStatus.QUEUED,
		progress: 0,
		startedAt: now,
		completedAt: undefined,
		error: undefined,
		contentPackId: params.contentPackId,
	};
}

/**
 * Update upload item status
 * @param item - Upload item to update
 * @param status - New status
 * @param progress - New progress (0-100)
 * @param error - Error message if failed
 * @returns Updated upload item
 */
export function updateUploadItemStatus(
	item: UploadItem,
	status: UploadStatus,
	progress?: number,
	error?: string,
): UploadItem {
	const updatedItem: UploadItem = {
		...item,
		status,
		progress: progress ?? item.progress,
		error: error ?? item.error,
	};

	// Set completion time if status is completed or failed
	if (status === UploadStatus.COMPLETED || status === UploadStatus.FAILED) {
		updatedItem.completedAt = new Date();
	}

	return updatedItem;
}

/**
 * Type guard to check if an object is an UploadQueue
 * @param obj - Object to check
 * @returns true if object is an UploadQueue
 */
export function isUploadQueue(obj: unknown): obj is UploadQueue {
	return (
		typeof obj === "object" &&
		obj !== null &&
		"id" in obj &&
		"pendingUploads" in obj &&
		"completedUploads" in obj &&
		"maxConcurrentUploads" in obj &&
		"createdAt" in obj &&
		"updatedAt" in obj
	);
}

/**
 * Type guard to check if an object is an UploadItem
 * @param obj - Object to check
 * @returns true if object is an UploadItem
 */
export function isUploadItem(obj: unknown): obj is UploadItem {
	return (
		typeof obj === "object" &&
		obj !== null &&
		"id" in obj &&
		"userId" in obj &&
		"fileName" in obj &&
		"fileSize" in obj &&
		"status" in obj &&
		"progress" in obj &&
		"startedAt" in obj
	);
}
