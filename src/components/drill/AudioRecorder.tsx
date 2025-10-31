/**
 * AudioRecorder Component
 * Wrapper around MediaRecorder API for recording audio responses with upload capability
 *
 * @file src/components/drill/AudioRecorder.tsx
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	logRecordingStarted,
	logRecordingStopped,
} from "@/lib/upload/analytics";

/**
 * Props for AudioRecorder component
 */
export interface AudioRecorderProps {
	/** Session ID for the drill session */
	sessionId?: string;
	/** Question ID being answered */
	questionId?: string;
	/** User ID */
	userId?: string;
	/** Callback when recording completes */
	onRecordingComplete: (blob: Blob, duration: number) => void;
	/** Callback when recording error occurs */
	onError?: (error: Error) => void;
	/** Maximum recording duration in seconds (default: 90) */
	maxDuration?: number;
	/** Whether recording is disabled */
	disabled?: boolean;
}

/**
 * AudioRecorder component
 * Provides audio recording functionality with MediaRecorder API
 */
export function AudioRecorder({
	sessionId: _sessionId,
	questionId: _questionId,
	userId: _userId,
	onRecordingComplete,
	onError,
	maxDuration = 90,
}: AudioRecorderProps) {
	const [isRecording, setIsRecording] = useState(false);
	const [duration, setDuration] = useState(0);
	const [error, setError] = useState<string | null>(null);

	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const audioChunksRef = useRef<Blob[]>([]);
	const timerRef = useRef<NodeJS.Timeout | null>(null);
	const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const recordingIdRef = useRef<string | null>(null);
	const durationRef = useRef<number>(0);

	/**
	 * Stop recording
	 */
	const stopRecording = useCallback(() => {
		const mediaRecorder = mediaRecorderRef.current;
		if (mediaRecorder && mediaRecorder.state !== "inactive") {
			mediaRecorder.stop();
		}
		setIsRecording(false);

		// Log recording stopped with the latest duration
		if (recordingIdRef.current) {
			logRecordingStopped(recordingIdRef.current, durationRef.current);
		}

		// Clear timer
		if (timerRef.current) {
			clearInterval(timerRef.current);
			timerRef.current = null;
		}

		if (stopTimeoutRef.current) {
			clearTimeout(stopTimeoutRef.current);
			stopTimeoutRef.current = null;
		}
	}, []);

	/**
	 * Resolve a microphone stream with environment and permission checks
	 */
	const getMicrophoneStream = useCallback(async (): Promise<MediaStream> => {
		if (typeof window === "undefined") {
			throw new Error("Microphone is only available in the browser.");
		}

		if (!window.isSecureContext) {
			throw new Error(
				"Microphone requires a secure context. Use HTTPS or http://localhost.",
			);
		}

		if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
			throw new Error("This browser does not support audio recording.");
		}

		try {
			// Best-effort: check current permission state without prompting (not supported in all browsers)
			const permissions = (
				navigator as unknown as { permissions?: Permissions }
			).permissions;
			if (permissions?.query) {
				try {
					const status = await permissions.query({
						name: "microphone" as unknown as PermissionName,
					});
					if (status.state === "denied") {
						throw new Error(
							"Microphone permission is blocked. Enable it in site settings.",
						);
					}
					// If "prompt" or "granted", proceed to request
				} catch {
					// Ignore and fall back to direct getUserMedia
				}
			}

			return await navigator.mediaDevices.getUserMedia({
				audio: {
					channelCount: 1,
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true,
				},
			});
		} catch (e) {
			const err = e as DOMException & { name?: string; message?: string };
			// Map common errors to actionable messages
			if (err?.name) {
				switch (err.name) {
					case "NotAllowedError":
						throw new Error(
							"Microphone permission denied. Click the camera/mic icon in the address bar to allow.",
						);
					case "NotFoundError":
						throw new Error(
							"No microphone found. Please connect a mic or check OS input settings.",
						);
					case "NotReadableError":
						throw new Error(
							"Microphone is in use by another app. Close it and try again.",
						);
					case "SecurityError":
						throw new Error(
							"Access blocked by browser security policy. Ensure HTTPS or localhost.",
						);
					default:
						throw new Error(err.message || "Unable to access microphone.");
				}
			}

			throw new Error("Unable to access microphone.");
		}
	}, []);

	/**
	 * Start recording audio
	 */
	const startRecording = useCallback(async () => {
		try {
			setError(null);
			audioChunksRef.current = [];

			// Request microphone access with checks
			const stream = await getMicrophoneStream();

			streamRef.current = stream;

			// Create MediaRecorder
			const mediaRecorder = new MediaRecorder(stream, {
				mimeType: "audio/webm;codecs=opus",
			});

			mediaRecorderRef.current = mediaRecorder;

			// Handle data available
			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					audioChunksRef.current.push(event.data);
				}
			};

			// Handle recording stop
			mediaRecorder.onstop = () => {
				const blob = new Blob(audioChunksRef.current, {
					type: "audio/webm;codecs=opus",
				});

				onRecordingComplete(blob, duration);
				audioChunksRef.current = [];

				// Stop all tracks
				if (streamRef.current) {
					streamRef.current.getTracks().forEach((track) => {
						track.stop();
					});
					streamRef.current = null;
				}
			};

			// Start recording
			mediaRecorder.start(100); // Collect data every 100ms

			// Generate recording ID
			recordingIdRef.current = crypto.randomUUID();

			// Log recording started
			if (recordingIdRef.current) {
				logRecordingStarted(recordingIdRef.current);
			}

			setIsRecording(true);
			setDuration(0);
			durationRef.current = 0;

			// Start timer
			timerRef.current = setInterval(() => {
				setDuration((prev) => {
					const newDuration = prev + 1;
					durationRef.current = newDuration;
					// Auto-stop at max duration
					if (newDuration >= maxDuration) {
						stopRecording();
					}
					return newDuration;
				});
			}, 1000);

			// Hard cutoff to ensure exact stop at maxDuration seconds
			stopTimeoutRef.current = setTimeout(() => {
				stopRecording();
			}, maxDuration * 1000);
		} catch (err) {
			console.error("Failed to start recording:", err);
			const message =
				(err as Error)?.message ||
				"Failed to access microphone. Please grant permission.";
			setError(message);
			// Bubble error to parent if provided
			onError?.(new Error(message));
		}
	}, [
		maxDuration,
		onRecordingComplete,
		duration,
		stopRecording,
		onError,
		getMicrophoneStream,
	]);

	/**
	 * Cancel recording
	 */
	const cancelRecording = useCallback(() => {
		const mediaRecorder = mediaRecorderRef.current;
		if (mediaRecorder && mediaRecorder.state !== "inactive") {
			mediaRecorder.stop();
		}
		setIsRecording(false);
		audioChunksRef.current = [];

		// Stop all tracks
		if (streamRef.current) {
			streamRef.current.getTracks().forEach((track) => {
				track.stop();
			});
			streamRef.current = null;
		}

		// Clear timer
		if (timerRef.current) {
			clearInterval(timerRef.current);
			timerRef.current = null;
		}

		if (stopTimeoutRef.current) {
			clearTimeout(stopTimeoutRef.current);
			stopTimeoutRef.current = null;
		}

		setDuration(0);
		durationRef.current = 0;
	}, []);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (timerRef.current) {
				clearInterval(timerRef.current);
			}
			if (stopTimeoutRef.current) {
				clearTimeout(stopTimeoutRef.current);
			}
			if (streamRef.current) {
				streamRef.current.getTracks().forEach((track) => {
					track.stop();
				});
			}
		};
	}, []);

	// Format duration as MM:SS
	const formatDuration = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	return (
		<div className="flex flex-col items-center gap-4">
			<div className="text-sm font-medium">
				Duration: {formatDuration(duration)} / {formatDuration(maxDuration)}
			</div>

			{error && (
				<div className="text-sm text-destructive" role="alert">
					{error}
				</div>
			)}

			<div className="flex gap-4">
				{!isRecording ? (
					<Button onClick={startRecording} size="lg">
						Start Recording
					</Button>
				) : (
					<>
						<Button onClick={stopRecording} variant="default" size="lg">
							Stop
						</Button>
						<Button onClick={cancelRecording} variant="outline" size="lg">
							Cancel
						</Button>
					</>
				)}
			</div>

			{isRecording && (
				<div className="flex items-center gap-2 text-red-600">
					<div className="h-3 w-3 rounded-full bg-red-600 animate-pulse" />
					<span className="text-sm font-medium">Recording...</span>
				</div>
			)}
		</div>
	);
}
