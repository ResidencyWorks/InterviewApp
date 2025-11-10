/**
 * Upload Service
 * Core orchestration for audio file upload with progress tracking and retry logic
 *
 * @file src/lib/upload/upload-service.ts
 */

import { uploadFile } from "@/features/booking/infrastructure/storage/supabase-storage";
import {
	logUploadCompleted,
	logUploadFailed,
	logUploadProgress,
	logUploadStarted,
} from "./analytics";
import { captureUploadError } from "./errors";
import { retryWithBackoff } from "./retry-logic";
import type { ProgressCallback, UploadResult, UploadSession } from "./types";
import { createUploadSession } from "./types";

/**
 * Upload options
 */
export interface UploadOptions {
	/** Progress callback function */
	onProgress?: ProgressCallback;
	/** File to upload */
	file: File;
	/** Storage path in bucket */
	storagePath: string;
	/** Recording ID */
	recordingId: string;
	/** User ID */
	userId: string;
}

/**
 * Upload a file with progress tracking and retry logic
 *
 * @param options - Upload options
 * @returns Upload result
 */
export async function uploadWithProgress(
	options: UploadOptions,
): Promise<UploadResult> {
	const { file, storagePath, recordingId, userId, onProgress } = options;

	// Create upload session
	const session: UploadSession = createUploadSession(recordingId, file.size);

	const startTime = Date.now();

	try {
		// Log upload started
		logUploadStarted(recordingId, file.size);

		// Update progress to 0%
		onProgress?.(0, 0, file.size);

		// Execute upload with retry logic
		await retryWithBackoff(async () => {
			// Attempt upload
			const result = await uploadFile(file, storagePath);

			if (!result.success) {
				throw new Error(result.error || "Upload failed");
			}

			return result;
		});

		// Update progress to 100%
		onProgress?.(100, file.size, file.size);
		logUploadProgress(recordingId, 100);

		// Calculate upload duration
		const uploadDuration = Date.now() - startTime;

		// Log completion
		logUploadCompleted(recordingId, uploadDuration);

		return {
			success: true,
			recordingId,
		};
	} catch (error) {
		// Log failure
		logUploadFailed(recordingId, "UPLOAD_ERROR", session.attempt);

		// Capture error in Sentry
		captureUploadError(error, {
			recordingId,
			userId,
			fileSize: file.size,
			attempt: session.attempt,
		});

		return {
			success: false,
			error: error instanceof Error ? error.message : "Upload failed",
		};
	}
}

/**
 * Upload file using fetch with progress tracking
 * This is a more low-level implementation that supports progress events
 *
 * @param file - File to upload
 * @param uploadUrl - Upload URL endpoint
 * @param onProgress - Progress callback
 * @returns Upload result
 */
export async function uploadFileWithFetchProgress(
	file: File,
	uploadUrl: string,
	onProgress?: (progress: number, bytesUploaded: number) => void,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();

		// Track upload progress
		xhr.upload.addEventListener("progress", (event) => {
			if (event.lengthComputable) {
				const progress = (event.loaded / event.total) * 100;
				onProgress?.(progress, event.loaded);
			}
		});

		// Handle completion
		xhr.addEventListener("load", () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				resolve();
			} else {
				reject(new Error(`Upload failed with status ${xhr.status}`));
			}
		});

		// Handle errors
		xhr.addEventListener("error", () => {
			reject(new Error("Upload failed"));
		});

		xhr.addEventListener("abort", () => {
			reject(new Error("Upload aborted"));
		});

		// Start upload
		xhr.open("PUT", uploadUrl);
		xhr.setRequestHeader("Content-Type", file.type);
		xhr.send(file);
	});
}
