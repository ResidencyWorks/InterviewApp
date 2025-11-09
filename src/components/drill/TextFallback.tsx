/**
 * TextFallback Component
 * Alternative text input interface for when microphone permissions are unavailable
 *
 * @file src/components/drill/TextFallback.tsx
 */

"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { logFallbackUsed } from "@/features/booking/application/upload/analytics";

/**
 * Props for TextFallback component
 */
export interface TextFallbackProps {
	/** Session ID for the drill session */
	sessionId: string;
	/** Question ID being answered */
	questionId: string;
	/** User ID */
	userId?: string;
	/** Callback when text submission completes */
	onTextSubmit: (text: string) => void;
	/** Maximum character limit */
	maxLength?: number;
	/** Minimum character requirement */
	minLength?: number;
}

/**
 * TextFallback component
 * Provides text input as fallback when microphone is unavailable
 */
export function TextFallback({
	sessionId: _sessionId,
	questionId: _questionId,
	userId,
	onTextSubmit,
	maxLength = 5000,
	minLength = 10,
}: TextFallbackProps) {
	const [text, setText] = useState("");
	const [error, setError] = useState<string | null>(null);
	const textAreaId = useId();

	/**
	 * Handle form submission
	 */
	const handleSubmit = () => {
		// Validate text length
		if (text.length < minLength) {
			setError(`Please enter at least ${minLength} characters`);
			return;
		}

		if (text.length > maxLength) {
			setError(`Text exceeds maximum length of ${maxLength} characters`);
			return;
		}

		// Log fallback usage
		const recordingId = crypto.randomUUID();
		if (userId) {
			logFallbackUsed(userId, recordingId);
		}

		// Submit text
		onTextSubmit(text);
	};

	return (
		<div className="flex flex-col gap-4">
			<div className="space-y-2">
				<label htmlFor={textAreaId} className="text-sm font-medium">
					Type your response here
				</label>
				<Textarea
					id={textAreaId}
					value={text}
					onChange={(e) => {
						setText(e.target.value);
						setError(null);
					}}
					placeholder="Enter your response to the question..."
					className="min-h-[200px]"
					maxLength={maxLength}
				/>
				<div className="flex justify-between text-xs text-muted-foreground">
					<span>
						{text.length} / {maxLength} characters
					</span>
					<span>Minimum: {minLength} characters</span>
				</div>
			</div>

			{error && (
				<div className="text-sm text-destructive" role="alert">
					{error}
				</div>
			)}

			<Button
				onClick={handleSubmit}
				disabled={text.length < minLength || text.length === 0}
			>
				Submit Response
			</Button>

			<p className="text-xs text-muted-foreground">
				This text input is available as an alternative when microphone access is
				not available.
			</p>
		</div>
	);
}
