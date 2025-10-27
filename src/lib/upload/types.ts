/**
 * Upload Types and Interfaces
 * Defines types for upload operations, sessions, and progress tracking
 *
 * @file src/lib/upload/types.ts
 */

/**
 * Upload status states
 */
export type UploadStatus =
	| "pending"
	| "uploading"
	| "completed"
	| "failed"
	| "cancelled";

/**
 * Upload error codes
 */
export type UploadErrorCode =
	| "NETWORK_ERROR"
	| "QUOTA_EXCEEDED"
	| "INVALID_FILE"
	| "PERMISSION_DENIED"
	| "TIMEOUT"
	| "UNKNOWN";

/**
 * Upload session tracking model
 * Tracks the lifecycle of a file upload attempt
 */
export interface UploadSession {
	/** Unique identifier */
	id: string;

	/** Associated recording ID */
	recordingId: string;

	/** Progress tracking */
	bytesUploaded: number;
	totalBytes: number;
	progress: number; // Percentage (0-100)

	/** Retry state */
	attempt: number;
	maxAttempts: number;
	nextRetryAt?: Date;

	/** Status information */
	status: UploadStatus;
	errorCode?: UploadErrorCode;
	errorMessage?: string;

	/** Timestamps */
	startedAt: Date;
	completedAt?: Date;
	lastProgressUpdate: Date;
}

/**
 * Progress update callback function type
 *
 * @param progress - Current progress percentage (0-100)
 * @param bytesUploaded - Bytes uploaded so far
 * @param totalBytes - Total file size in bytes
 */
export type ProgressCallback = (
	progress: number,
	bytesUploaded: number,
	totalBytes: number,
) => void;

/**
 * Upload result
 */
export interface UploadResult {
	success: boolean;
	error?: string;
	recordingId?: string;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
	baseDelay: number; // Base delay in milliseconds
	multiplier: number; // Exponential multiplier
	jitter: number; // Jitter percentage (0-1)
	maxAttempts: number; // Maximum retry attempts
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
	baseDelay: 1000, // 1 second
	multiplier: 2, // Double each time
	jitter: 0.25, // ±25%
	maxAttempts: 3,
};

/**
 * Create a new upload session
 *
 * @param recordingId - Associated recording ID
 * @param totalBytes - Total file size
 * @returns New upload session
 */
export function createUploadSession(
	recordingId: string,
	totalBytes: number,
): UploadSession {
	return {
		id: crypto.randomUUID(),
		recordingId,
		bytesUploaded: 0,
		totalBytes,
		progress: 0,
		attempt: 1,
		maxAttempts: 3,
		status: "pending",
		startedAt: new Date(),
		lastProgressUpdate: new Date(),
	};
}

/**
 * Update upload progress
 *
 * @param session - Upload session to update
 * @param bytesUploaded - New bytes uploaded value
 * @returns Updated session
 */
export function updateUploadProgress(
	session: UploadSession,
	bytesUploaded: number,
): UploadSession {
	const progress = Math.min(100, (bytesUploaded / session.totalBytes) * 100);

	return {
		...session,
		bytesUploaded,
		progress,
		status: "uploading",
		lastProgressUpdate: new Date(),
	};
}
