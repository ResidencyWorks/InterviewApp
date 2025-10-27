/**
 * AdaptiveInput Component
 * Adapts between audio recording and text input based on microphone availability
 *
 * @file src/components/drill/AdaptiveInput.tsx
 */

"use client";

import { useEffect, useState } from "react";
import { logPermissionDenied } from "@/lib/upload/analytics";
import { AudioRecorder } from "./AudioRecorder";
import { TextFallback } from "./TextFallback";

/**
 * Props for AdaptiveInput component
 */
export interface AdaptiveInputProps {
	/** Session ID for the drill session */
	sessionId: string;
	/** Question ID being answered */
	questionId: string;
	/** User ID */
	userId?: string;
	/** Callback when audio recording completes */
	onAudioComplete: (blob: Blob, duration: number) => void;
	/** Callback when text submission completes */
	onTextSubmit: (text: string) => void;
}

/**
 * AdaptiveInput component
 * Switches between audio recording and text input based on microphone availability
 */
export function AdaptiveInput({
	sessionId,
	questionId,
	userId,
	onAudioComplete,
	onTextSubmit,
}: AdaptiveInputProps) {
	const [micAvailable, setMicAvailable] = useState<boolean | null>(null);
	const [showFallback, setShowFallback] = useState(false);
	const [manualMode, setManualMode] = useState<"audio" | "text" | null>(null);

	/**
	 * Check microphone permissions
	 */
	useEffect(() => {
		const checkMicrophone = async () => {
			try {
				// Check if the MediaDevices API is available
				if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
					setMicAvailable(false);
					return;
				}

				// Try to access microphone
				const stream = await navigator.mediaDevices.getUserMedia({
					audio: true,
				});

				// Stop the stream immediately
				stream.getTracks().forEach((track) => {
					track.stop();
				});

				setMicAvailable(true);
			} catch (error) {
				// Microphone not available or permission denied
				console.log("Microphone not available:", error);
				setMicAvailable(false);
				setShowFallback(true);

				// Log permission denial
				if (userId) {
					logPermissionDenied(userId);
				}
			}
		};

		checkMicrophone();
	}, [userId]);

	/**
	 * Handle audio recording error
	 */
	const _handleAudioError = (error: string) => {
		console.error("Audio recording error:", error);
		setShowFallback(true);

		// Log permission denial if error is about microphone
		if (
			error.toLowerCase().includes("microphone") ||
			error.toLowerCase().includes("permission")
		) {
			if (userId) {
				logPermissionDenied(userId);
			}
		}
	};

	/**
	 * Handle text submission
	 */
	const handleTextSubmit = async (text: string) => {
		try {
			const response = await fetch("/api/text-submit", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					text,
					sessionId,
					questionId,
					userId,
				}),
			});

			const data = await response.json();

			if (data.success) {
				onTextSubmit(text);
			} else {
				console.error("Text submission failed:", data.error);
			}
		} catch (error) {
			console.error("Error submitting text:", error);
		}
	};

	// Show fallback if microphone unavailable OR user manually selected text mode
	const useFallback = !micAvailable || manualMode === "text";
	const useAudio = micAvailable && manualMode !== "text";

	return (
		<div className="flex flex-col gap-4">
			{/* Mode toggle buttons */}
			<div className="flex gap-2 justify-center">
				<button
					type="button"
					onClick={() => setManualMode("audio")}
					className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
						!useFallback
							? "bg-primary text-primary-foreground"
							: "bg-secondary text-secondary-foreground"
					}`}
				>
					🎤 Record Audio
				</button>
				<button
					type="button"
					onClick={() => setManualMode("text")}
					className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
						useFallback && micAvailable
							? "bg-primary text-primary-foreground"
							: "bg-secondary text-secondary-foreground"
					}`}
				>
					✍️ Type Response
				</button>
			</div>

			{/* Audio recorder */}
			{useAudio && !showFallback && (
				<div>
					<AudioRecorder
						sessionId={sessionId}
						questionId={questionId}
						userId={userId}
						onRecordingComplete={onAudioComplete}
					/>
				</div>
			)}

			{/* Text fallback */}
			{useFallback && (
				<div>
					{!micAvailable && (
						<div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
							<p className="text-sm text-yellow-800 dark:text-yellow-200">
								⚠️ Microphone access is not available. Please type your response
								instead.
							</p>
						</div>
					)}
					<TextFallback
						sessionId={sessionId}
						questionId={questionId}
						userId={userId}
						onTextSubmit={handleTextSubmit}
					/>
				</div>
			)}
		</div>
	);
}
