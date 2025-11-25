/**
 * Upload Error Types
 * Defines custom errors for upload operations with Sentry integration
 *
 * @file src/lib/upload/errors.ts
 */

import { captureException } from "@/shared/error/ErrorTrackingService";

/**
 * Base error class for upload operations
 */
export class UploadError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly statusCode: number = 500,
	) {
		super(message);
		this.name = "UploadError";
	}
}

/**
 * Network error during upload
 */
export class NetworkUploadError extends UploadError {
	constructor(message: string = "Network error during upload") {
		super(message, "NETWORK_ERROR", 503);
		this.name = "NetworkUploadError";
	}
}

/**
 * Validation error for file
 */
export class FileValidationError extends UploadError {
	constructor(message: string = "Invalid file") {
		super(message, "INVALID_FILE", 400);
		this.name = "FileValidationError";
	}
}

/**
 * Permission error
 */
export class PermissionError extends UploadError {
	constructor(message: string = "Permission denied") {
		super(message, "PERMISSION_DENIED", 403);
		this.name = "PermissionError";
	}
}

/**
 * Quota exceeded error
 */
export class QuotaError extends UploadError {
	constructor(message: string = "Storage quota exceeded") {
		super(message, "QUOTA_EXCEEDED", 413);
		this.name = "QuotaError";
	}
}

/**
 * Timeout error
 */
export class TimeoutError extends UploadError {
	constructor(message: string = "Upload timeout") {
		super(message, "TIMEOUT", 504);
		this.name = "TimeoutError";
	}
}

/**
 * Capture upload error to Sentry
 *
 * @param error - Error to capture
 * @param context - Additional context
 */
export function captureUploadError(
	error: unknown,
	context: {
		recordingId?: string;
		userId?: string;
		fileSize?: number;
		attempt?: number;
	} = {},
): void {
	const errorInfo = error instanceof Error ? error : new Error(String(error));

	const tags: Record<string, string> = {
		service: "audio-upload",
		component: "upload-service",
	};
	if (context.recordingId) tags.recording_id = context.recordingId;
	if (context.userId) tags.user_id = context.userId;

	const extra: Record<string, unknown> = {
		error: {
			name: errorInfo.name,
			message: errorInfo.message,
			stack: errorInfo.stack,
		},
	};
	if (context.attempt) extra.retry = { attempt: context.attempt };
	if (context.fileSize) extra.upload = { fileSize: context.fileSize };

	captureException(errorInfo, {
		tags,
		extra,
	});
}

/**
 * Check if error is retryable
 *
 * @param error - Error to check
 * @returns True if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
	return (
		error instanceof NetworkUploadError ||
		error instanceof TimeoutError ||
		(error instanceof Error && error.message.includes("network"))
	);
}
