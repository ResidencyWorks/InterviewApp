/**
 * UploadQueueService implementation for managing upload queue operations
 *
 * @fileoverview Domain service for upload queue management
 */

import type { UploadItem, UploadQueue } from "../entities/UploadQueue";
import {
	createUploadQueue,
	UploadStatus,
	updateUploadItemStatus,
} from "../entities/UploadQueue";

/**
 * Upload queue service interface
 */
export interface IUploadQueueService {
	/**
	 * Get the upload queue
	 * @returns Promise resolving to upload queue
	 */
	getQueue(): Promise<UploadQueue>;

	/**
	 * Add an upload item to the queue
	 * @param item - Upload item to add
	 * @returns Promise resolving to the added upload item
	 */
	addToQueue(item: UploadItem): Promise<UploadItem>;

	/**
	 * Get the next upload item from the queue
	 * @returns Promise resolving to next upload item or null
	 */
	getNextUpload(): Promise<UploadItem | null>;

	/**
	 * Update upload item status
	 * @param itemId - Upload item ID
	 * @param status - New status
	 * @param progress - Progress percentage (0-100)
	 * @param error - Error message if failed
	 * @returns Promise resolving to updated upload item
	 */
	updateUploadStatus(
		itemId: string,
		status: UploadStatus,
		progress?: number,
		error?: string,
	): Promise<UploadItem>;

	/**
	 * Remove completed uploads from the queue
	 * @param olderThan - Remove uploads older than this date
	 * @returns Promise resolving to number of removed uploads
	 */
	cleanupCompletedUploads(olderThan?: Date): Promise<number>;

	/**
	 * Get upload item by ID
	 * @param itemId - Upload item ID
	 * @returns Promise resolving to upload item or null
	 */
	getUploadItem(itemId: string): Promise<UploadItem | null>;

	/**
	 * Get uploads by user ID
	 * @param userId - User ID
	 * @returns Promise resolving to array of upload items
	 */
	getUploadsByUser(userId: string): Promise<UploadItem[]>;

	/**
	 * Cancel an upload
	 * @param itemId - Upload item ID
	 * @returns Promise resolving to cancelled upload item
	 */
	cancelUpload(itemId: string): Promise<UploadItem>;
}

/**
 * Upload queue service configuration
 */
export interface UploadQueueServiceConfig {
	maxQueueSize: number;
	maxConcurrentUploads: number;
	cleanupInterval: number; // milliseconds
	maxCompletedUploads: number;
}

export class UploadQueueService implements IUploadQueueService {
	private queue: UploadQueue;
	private config: UploadQueueServiceConfig;
	private cleanupTimer: NodeJS.Timeout | null = null;

	constructor(config: UploadQueueServiceConfig) {
		this.config = {
			...config,
			maxQueueSize: config.maxQueueSize ?? 100,
			maxConcurrentUploads: config.maxConcurrentUploads ?? 1,
			cleanupInterval: config.cleanupInterval ?? 300000, // 5 minutes
			maxCompletedUploads: config.maxCompletedUploads ?? 50,
		};

		this.queue = createUploadQueue("main", this.config.maxConcurrentUploads);
		this.startCleanupTimer();
	}

	/**
	 * Get the upload queue
	 */
	async getQueue(): Promise<UploadQueue> {
		return { ...this.queue };
	}

	/**
	 * Add an upload item to the queue
	 */
	async addToQueue(item: UploadItem): Promise<UploadItem> {
		// Check queue size limit
		if (this.queue.pendingUploads.length >= this.config.maxQueueSize) {
			throw new Error(
				`Upload queue is full. Maximum size: ${this.config.maxQueueSize}`,
			);
		}

		// Check if user already has an upload in progress
		const userActiveUploads = this.queue.pendingUploads.filter(
			(upload) =>
				upload.userId === item.userId &&
				(upload.status === UploadStatus.QUEUED ||
					upload.status === UploadStatus.UPLOADING),
		);

		if (userActiveUploads.length > 0) {
			throw new Error("User already has an upload in progress");
		}

		// Add to pending uploads
		this.queue.pendingUploads.push(item);
		this.queue.updatedAt = new Date();

		return item;
	}

	/**
	 * Get the next upload item from the queue
	 */
	async getNextUpload(): Promise<UploadItem | null> {
		// Check if there's already a current upload
		if (this.queue.currentUpload) {
			return null;
		}

		// Get the next queued upload
		const nextUpload = this.queue.pendingUploads.find(
			(upload) => upload.status === UploadStatus.QUEUED,
		);

		if (!nextUpload) {
			return null;
		}

		// Move to current upload
		this.queue.currentUpload = nextUpload;
		this.queue.pendingUploads = this.queue.pendingUploads.filter(
			(upload) => upload.id !== nextUpload.id,
		);

		// Update status to uploading
		this.queue.currentUpload = updateUploadItemStatus(
			this.queue.currentUpload,
			UploadStatus.UPLOADING,
			0,
		);

		this.queue.updatedAt = new Date();

		return this.queue.currentUpload;
	}

	/**
	 * Update upload item status
	 */
	async updateUploadStatus(
		itemId: string,
		status: UploadStatus,
		progress?: number,
		error?: string,
	): Promise<UploadItem> {
		let updatedItem: UploadItem | null = null;

		// Check current upload
		if (this.queue.currentUpload && this.queue.currentUpload.id === itemId) {
			updatedItem = updateUploadItemStatus(
				this.queue.currentUpload,
				status,
				progress,
				error,
			);
			this.queue.currentUpload = updatedItem;

			// If completed or failed, move to completed uploads
			if (status === UploadStatus.COMPLETED || status === UploadStatus.FAILED) {
				this.queue.completedUploads.push(updatedItem);
				this.queue.currentUpload = undefined;
			}
		} else {
			// Check pending uploads
			const pendingIndex = this.queue.pendingUploads.findIndex(
				(upload) => upload.id === itemId,
			);
			if (pendingIndex !== -1) {
				updatedItem = updateUploadItemStatus(
					this.queue.pendingUploads[pendingIndex],
					status,
					progress,
					error,
				);
				this.queue.pendingUploads[pendingIndex] = updatedItem;
			} else {
				// Check completed uploads
				const completedIndex = this.queue.completedUploads.findIndex(
					(upload) => upload.id === itemId,
				);
				if (completedIndex !== -1) {
					updatedItem = updateUploadItemStatus(
						this.queue.completedUploads[completedIndex],
						status,
						progress,
						error,
					);
					this.queue.completedUploads[completedIndex] = updatedItem;
				}
			}
		}

		if (!updatedItem) {
			throw new Error(`Upload item with ID ${itemId} not found`);
		}

		this.queue.updatedAt = new Date();
		return updatedItem;
	}

	/**
	 * Remove completed uploads from the queue
	 */
	async cleanupCompletedUploads(olderThan?: Date): Promise<number> {
		const cutoffDate = olderThan || new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

		const initialCount = this.queue.completedUploads.length;

		this.queue.completedUploads = this.queue.completedUploads.filter(
			(upload) => upload.completedAt && upload.completedAt > cutoffDate,
		);

		// Also limit the number of completed uploads
		if (this.queue.completedUploads.length > this.config.maxCompletedUploads) {
			this.queue.completedUploads = this.queue.completedUploads
				.sort(
					(a, b) =>
						(b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0),
				)
				.slice(0, this.config.maxCompletedUploads);
		}

		const removedCount = initialCount - this.queue.completedUploads.length;
		this.queue.updatedAt = new Date();

		return removedCount;
	}

	/**
	 * Get upload item by ID
	 */
	async getUploadItem(itemId: string): Promise<UploadItem | null> {
		// Check current upload
		if (this.queue.currentUpload && this.queue.currentUpload.id === itemId) {
			return this.queue.currentUpload;
		}

		// Check pending uploads
		const pendingUpload = this.queue.pendingUploads.find(
			(upload) => upload.id === itemId,
		);
		if (pendingUpload) {
			return pendingUpload;
		}

		// Check completed uploads
		const completedUpload = this.queue.completedUploads.find(
			(upload) => upload.id === itemId,
		);
		if (completedUpload) {
			return completedUpload;
		}

		return null;
	}

	/**
	 * Get uploads by user ID
	 */
	async getUploadsByUser(userId: string): Promise<UploadItem[]> {
		const userUploads: UploadItem[] = [];

		// Check current upload
		if (
			this.queue.currentUpload &&
			this.queue.currentUpload.userId === userId
		) {
			userUploads.push(this.queue.currentUpload);
		}

		// Check pending uploads
		userUploads.push(
			...this.queue.pendingUploads.filter((upload) => upload.userId === userId),
		);

		// Check completed uploads
		userUploads.push(
			...this.queue.completedUploads.filter(
				(upload) => upload.userId === userId,
			),
		);

		return userUploads;
	}

	/**
	 * Cancel an upload
	 */
	async cancelUpload(itemId: string): Promise<UploadItem> {
		const uploadItem = await this.getUploadItem(itemId);
		if (!uploadItem) {
			throw new Error(`Upload item with ID ${itemId} not found`);
		}

		// Can only cancel queued or uploading uploads
		if (
			uploadItem.status !== UploadStatus.QUEUED &&
			uploadItem.status !== UploadStatus.UPLOADING
		) {
			throw new Error(`Cannot cancel upload with status: ${uploadItem.status}`);
		}

		const cancelledItem = updateUploadItemStatus(
			uploadItem,
			UploadStatus.FAILED,
			undefined,
			"Cancelled by user",
		);

		// Update in the appropriate location
		if (this.queue.currentUpload && this.queue.currentUpload.id === itemId) {
			this.queue.currentUpload = cancelledItem;
			this.queue.completedUploads.push(cancelledItem);
			this.queue.currentUpload = undefined;
		} else {
			const pendingIndex = this.queue.pendingUploads.findIndex(
				(upload) => upload.id === itemId,
			);
			if (pendingIndex !== -1) {
				this.queue.pendingUploads[pendingIndex] = cancelledItem;
			}
		}

		this.queue.updatedAt = new Date();
		return cancelledItem;
	}

	/**
	 * Start cleanup timer
	 */
	private startCleanupTimer(): void {
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer);
		}

		this.cleanupTimer = setInterval(async () => {
			try {
				await this.cleanupCompletedUploads();
			} catch (error) {
				console.error("Failed to cleanup completed uploads:", error);
			}
		}, this.config.cleanupInterval);
	}

	/**
	 * Stop cleanup timer
	 */
	stopCleanupTimer(): void {
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer);
			this.cleanupTimer = null;
		}
	}

	/**
	 * Get queue statistics
	 */
	getQueueStatistics(): {
		totalPending: number;
		totalCompleted: number;
		currentUpload: boolean;
		queueSize: number;
	} {
		return {
			totalPending: this.queue.pendingUploads.length,
			totalCompleted: this.queue.completedUploads.length,
			currentUpload: this.queue.currentUpload !== undefined,
			queueSize:
				this.queue.pendingUploads.length + (this.queue.currentUpload ? 1 : 0),
		};
	}

	/**
	 * Shutdown the service
	 */
	shutdown(): void {
		this.stopCleanupTimer();
	}
}
