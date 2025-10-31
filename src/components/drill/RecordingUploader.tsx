/**
 * RecordingUploader Component
 * Integrates AudioRecorder with upload service for complete recording and upload workflow
 *
 * @file src/components/drill/RecordingUploader.tsx
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AudioRecorder } from "./AudioRecorder";

/**
 * Props for RecordingUploader component
 */
export interface RecordingUploaderProps {
	/** Session ID for the drill session */
	sessionId: string;
	/** Question ID being answered */
	questionId: string;
	/** User ID */
	userId?: string;
	/** Callback when upload completes successfully */
	onUploadComplete?: (recordingId: string) => void;
	/** Callback when upload fails */
	onUploadError?: (error: string) => void;
}

/**
 * RecordingUploader component
 * Combines audio recording with upload functionality
 */
export function RecordingUploader({
	sessionId,
	questionId,
	userId,
	onUploadComplete,
	onUploadError,
}: RecordingUploaderProps) {
	const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
	const [duration, setDuration] = useState(0);
	const [uploading, setUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [recordingId, setRecordingId] = useState<string | null>(null);

	/**
	 * Handle recording completion
	 */
	const handleRecordingComplete = (blob: Blob, recordedDuration: number) => {
		setAudioBlob(blob);
		setDuration(recordedDuration);
		setError(null);
	};

	/**
	 * Upload recording to server
	 */
	const handleUpload = async () => {
		if (!audioBlob) return;

		setUploading(true);
		setUploadProgress(0);
		setError(null);

		try {
			// Create file from blob
			const file = new File([audioBlob], "recording.webm", {
				type: audioBlob.type,
			});

			// Create form data
			const formData = new FormData();
			formData.append("file", file);
			formData.append("sessionId", sessionId);
			formData.append("questionId", questionId);
			formData.append("duration", duration.toString());

			if (userId) {
				formData.append("userId", userId);
			}

			// Upload with progress tracking
			const xhr = new XMLHttpRequest();

			// Track progress
			xhr.upload.addEventListener("progress", (event) => {
				if (event.lengthComputable) {
					const progress = (event.loaded / event.total) * 100;
					setUploadProgress(progress);
				}
			});

			// Handle completion
			xhr.addEventListener("load", () => {
				if (xhr.status >= 200 && xhr.status < 300) {
					const response = JSON.parse(xhr.responseText);

					if (response.success && response.recordingId) {
						setRecordingId(response.recordingId);
						onUploadComplete?.(response.recordingId);
					} else {
						const errorMsg = response.error?.message || "Upload failed";
						setError(errorMsg);
						onUploadError?.(errorMsg);
					}
				} else {
					const errorMsg = `Upload failed with status ${xhr.status}`;
					setError(errorMsg);
					onUploadError?.(errorMsg);
				}

				setUploading(false);
			});

			// Handle errors
			xhr.addEventListener("error", () => {
				const errorMsg = "Network error during upload";
				setError(errorMsg);
				onUploadError?.(errorMsg);
				setUploading(false);
			});

			// Start upload
			xhr.open("POST", "/api/upload");
			xhr.send(formData);
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : "Upload failed";
			setError(errorMsg);
			onUploadError?.(errorMsg);
			setUploading(false);
		}
	};

	/**
	 * Reset state for new recording
	 */
	const handleReset = () => {
		setAudioBlob(null);
		setDuration(0);
		setUploadProgress(0);
		setError(null);
		setRecordingId(null);
		setUploading(false);
	};

	return (
		<div className="flex flex-col gap-6">
			{/* Recording component */}
			<AudioRecorder
				sessionId={sessionId}
				questionId={questionId}
				userId={userId}
				onRecordingComplete={handleRecordingComplete}
			/>

			{/* Upload section */}
			{audioBlob && !recordingId && (
				<div className="flex flex-col gap-4">
					<div className="text-sm">
						<p>File size: {(audioBlob.size / 1024).toFixed(1)} KB</p>
						<p>Duration: {duration} seconds</p>
					</div>

					{uploading ? (
						<div className="flex flex-col gap-2">
							<div className="flex justify-between text-sm">
								<span>Uploading...</span>
								<span>{Math.round(uploadProgress)}%</span>
							</div>
							<Progress value={uploadProgress} />
						</div>
					) : (
						<Button onClick={handleUpload} disabled={uploading}>
							Upload Recording
						</Button>
					)}

					{error && (
						<div className="text-sm text-destructive" role="alert">
							{error}
						</div>
					)}
				</div>
			)}

			{/* Success message */}
			{recordingId && (
				<div className="flex flex-col gap-4">
					<div className="text-sm text-green-600">
						✓ Recording uploaded successfully!
					</div>
					<Button onClick={handleReset} variant="outline">
						Record Again
					</Button>
				</div>
			)}
		</div>
	);
}
