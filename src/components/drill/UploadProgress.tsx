/**
 * UploadProgress Component
 * Displays upload progress with retry functionality for audio recordings
 *
 * @file src/components/drill/UploadProgress.tsx
 */

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
	logUploadCompleted,
	logUploadFailed,
	logUploadProgress,
	logUploadRetry,
} from "@/features/booking/application/upload/analytics";

/**
 * Upload status for progress display
 */
type UploadStatusDisplay =
	| "idle"
	| "uploading"
	| "retrying"
	| "completed"
	| "failed";

/**
 * Props for UploadProgress component
 */
export interface UploadProgressProps {
	/** Current upload progress (0-100) */
	progress: number;
	/** Current upload status */
	status: UploadStatusDisplay;
	/** Recording ID being uploaded */
	recordingId: string;
	/** Current retry attempt number */
	retryAttempt?: number;
	/** Maximum retry attempts allowed */
	maxRetryAttempts?: number;
	/** Error message if upload failed */
	errorMessage?: string;
	/** Callback when manual retry is requested */
	onRetry?: () => void;
	/** Callback when upload is cancelled */
	onCancel?: () => void;
	/** Whether to show cancel button */
	showCancel?: boolean;
	/** Upload duration in milliseconds */
	uploadDuration?: number;
}

/**
 * UploadProgress component
 * Displays real-time upload progress with retry functionality
 */
export function UploadProgress({
	progress,
	status,
	recordingId,
	retryAttempt = 0,
	maxRetryAttempts = 3,
	errorMessage,
	onRetry,
	onCancel,
	showCancel = true,
	uploadDuration,
}: UploadProgressProps) {
	const [lastLogProgress, setLastLogProgress] = useState(0);

	/**
	 * Log progress events to PostHog every 10% increment
	 */
	useEffect(() => {
		const progressDifference = progress - lastLogProgress;

		// Log every 10% increment
		if (
			progressDifference >= 10 ||
			(progress >= 100 && lastLogProgress < 100)
		) {
			logUploadProgress(recordingId, progress);
			setLastLogProgress(progress);
		}
	}, [progress, lastLogProgress, recordingId]);

	/**
	 * Log retry events
	 */
	useEffect(() => {
		if (status === "retrying" && retryAttempt > 0) {
			logUploadRetry(recordingId, retryAttempt);
		}
	}, [status, retryAttempt, recordingId]);

	/**
	 * Log completion events
	 */
	useEffect(() => {
		if (status === "completed" && uploadDuration !== undefined) {
			logUploadCompleted(recordingId, uploadDuration || 0);
		}
	}, [status, recordingId, uploadDuration]);

	/**
	 * Log failure events
	 */
	useEffect(() => {
		if (status === "failed" && retryAttempt > 0) {
			logUploadFailed(recordingId, "UPLOAD_FAILED", retryAttempt);
		}
	}, [status, recordingId, retryAttempt]);

	/**
	 * Format upload time
	 */
	const formatDuration = (ms: number) => {
		const seconds = Math.floor(ms / 1000);
		return `${seconds}s`;
	};

	/**
	 * Get retry backoff delay (1s, 2s, 4s)
	 */
	const getRetryDelay = (attempt: number): number => {
		return 2 ** (attempt - 1) * 1000; // Exponential backoff
	};

	const canRetry = retryAttempt < maxRetryAttempts;
	const isRetrying = status === "retrying";
	const isFailed = status === "failed";
	const isCompleted = status === "completed";

	return (
		<div className="space-y-4">
			{/* Progress Indicator */}
			<div className="space-y-2">
				<div className="flex justify-between text-sm">
					<span className="font-medium">Upload Progress</span>
					<span className="text-muted-foreground">{Math.round(progress)}%</span>
				</div>
				<Progress value={progress} className="h-2" />
			</div>

			{/* Status Messages */}
			{isRetrying && (
				<div className="flex items-center gap-2 text-yellow-600">
					<div className="h-2 w-2 rounded-full bg-yellow-600 animate-pulse" />
					<span className="text-sm">
						Retrying upload (attempt {retryAttempt + 1}/{maxRetryAttempts})...
						{retryAttempt > 0 && (
							<span className="text-xs ml-1">
								(Next retry in {getRetryDelay(retryAttempt + 1) / 1000}s)
							</span>
						)}
					</span>
				</div>
			)}

			{isFailed && (
				<div className="space-y-2">
					<div className="flex items-center gap-2 text-destructive">
						<div className="h-2 w-2 rounded-full bg-red-600" />
						<span className="text-sm font-medium">Upload failed</span>
					</div>
					{errorMessage && (
						<p className="text-sm text-destructive">{errorMessage}</p>
					)}
				</div>
			)}

			{isCompleted && (
				<div className="flex items-center gap-2 text-green-600">
					<div className="h-2 w-2 rounded-full bg-green-600" />
					<span className="text-sm font-medium">
						Upload completed successfully
					</span>
					{uploadDuration !== undefined && (
						<span className="text-xs text-muted-foreground ml-1">
							({formatDuration(uploadDuration)})
						</span>
					)}
				</div>
			)}

			{/* Action Buttons */}
			<div className="flex justify-end gap-2">
				{showCancel && status !== "completed" && status !== "failed" && (
					<Button onClick={onCancel} variant="outline" size="sm">
						Cancel
					</Button>
				)}
				{isFailed && canRetry && onRetry && (
					<Button onClick={onRetry} size="sm">
						Retry Upload
					</Button>
				)}
				{isFailed && !canRetry && (
					<Button onClick={onRetry} disabled size="sm">
						Max Retries Reached
					</Button>
				)}
			</div>
		</div>
	);
}
