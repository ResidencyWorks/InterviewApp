/**
 * Upload Analytics
 * PostHog analytics utilities for upload events
 *
 * @file src/lib/upload/analytics.ts
 */

import posthog from "posthog-js";

/**
 * Log recording started event
 *
 * @param recordingId - Recording identifier
 */
export function logRecordingStarted(recordingId: string): void {
	posthog.capture("recording.started", {
		recordingId,
	});
}

/**
 * Log recording stopped event
 *
 * @param recordingId - Recording identifier
 * @param duration - Recording duration in seconds
 */
export function logRecordingStopped(
	recordingId: string,
	duration: number,
): void {
	posthog.capture("recording.stopped", {
		recordingId,
		duration,
	});
}

/**
 * Log upload started event
 *
 * @param recordingId - Recording identifier
 * @param fileSize - File size in bytes
 */
export function logUploadStarted(recordingId: string, fileSize: number): void {
	posthog.capture("upload.started", {
		recordingId,
		fileSize,
	});
}

/**
 * Log upload progress event
 *
 * @param recordingId - Recording identifier
 * @param progress - Progress percentage (0-100)
 */
export function logUploadProgress(recordingId: string, progress: number): void {
	posthog.capture("upload.progress", {
		recordingId,
		progress,
	});
}

/**
 * Log upload retry event
 *
 * @param recordingId - Recording identifier
 * @param attempt - Retry attempt number
 */
export function logUploadRetry(recordingId: string, attempt: number): void {
	posthog.capture("upload.retry", {
		recordingId,
		attempt,
	});
}

/**
 * Log upload completed event
 *
 * @param recordingId - Recording identifier
 * @param uploadDuration - Upload duration in milliseconds
 */
export function logUploadCompleted(
	recordingId: string,
	uploadDuration: number,
): void {
	posthog.capture("upload.completed", {
		recordingId,
		uploadDuration,
	});
}

/**
 * Log upload failed event
 *
 * @param recordingId - Recording identifier
 * @param errorCode - Error code
 * @param attempt - Attempt number
 */
export function logUploadFailed(
	recordingId: string,
	errorCode: string,
	attempt: number,
): void {
	posthog.capture("upload.failed", {
		recordingId,
		errorCode,
		attempt,
	});
}

/**
 * Log permission denied event
 *
 * @param userId - User identifier
 */
export function logPermissionDenied(userId: string): void {
	posthog.capture("recording.permission_denied", {
		userId,
	});
}

/**
 * Log fallback text input used
 *
 * @param userId - User identifier
 * @param recordingId - Recording identifier
 */
export function logFallbackUsed(userId: string, recordingId: string): void {
	posthog.capture("recording.fallback_used", {
		userId,
		recordingId,
	});
}
