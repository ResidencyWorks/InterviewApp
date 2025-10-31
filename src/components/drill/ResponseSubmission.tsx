"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { AudioRecorder } from "./AudioRecorder";
import { TextResponseInput } from "./TextResponseInput";

export type ResponseType = "text" | "audio";

export interface ResponseSubmissionProps {
	onSubmit: (data: {
		type: ResponseType;
		content: string;
		audioBlob?: Blob;
	}) => void;
	onError?: (error: Error) => void;
	className?: string;
	disabled?: boolean;
	isSubmitting?: boolean;
}

/**
 * ResponseSubmission component for submitting interview responses
 * @param onSubmit - Callback when response is submitted
 * @param onError - Callback for submission errors
 * @param className - Additional CSS classes
 * @param disabled - Whether submission is disabled
 * @param isSubmitting - Whether currently submitting
 */
export function ResponseSubmission({
	onSubmit,
	onError,
	className,
	disabled = false,
	isSubmitting = false,
}: ResponseSubmissionProps) {
	const [activeTab, setActiveTab] = React.useState<ResponseType>("text");
	const [textResponse, setTextResponse] = React.useState("");
	const [audioBlob, setAudioBlob] = React.useState<Blob | null>(null);
	const [_isRecording, setIsRecording] = React.useState(false);

	const handleAudioRecordingComplete = (blob: Blob) => {
		setAudioBlob(blob);
		setIsRecording(false);
	};

	const handleAudioError = (error: Error) => {
		onError?.(error);
		setIsRecording(false);
	};

	const handleSubmit = () => {
		if (activeTab === "text") {
			if (textResponse.trim().length < 10) {
				onError?.(
					new Error("Please provide at least 10 characters for your response"),
				);
				return;
			}
			onSubmit({
				type: "text",
				content: textResponse.trim(),
			});
		} else {
			if (!audioBlob) {
				onError?.(new Error("Please record an audio response first"));
				return;
			}
			onSubmit({
				type: "audio",
				content: "Audio response", // This will be transcribed by the API
				audioBlob,
			});
		}
	};

	const canSubmit = () => {
		if (activeTab === "text") {
			return textResponse.trim().length >= 10;
		} else {
			return audioBlob !== null;
		}
	};

	return (
		<Card className={cn("w-full max-w-2xl mx-auto", className)}>
			<CardHeader>
				<CardTitle>Submit Your Response</CardTitle>
			</CardHeader>
			<CardContent>
				<Tabs
					value={activeTab}
					onValueChange={(value) => setActiveTab(value as ResponseType)}
				>
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="text">Written Response</TabsTrigger>
						<TabsTrigger value="audio">Audio Response</TabsTrigger>
					</TabsList>

					<TabsContent value="text" className="space-y-4">
						<TextResponseInput
							value={textResponse}
							onChange={setTextResponse}
							placeholder="Type your interview response here. Be specific and provide examples where possible..."
							disabled={disabled || isSubmitting}
							minLength={10}
							maxLength={2000}
						/>
					</TabsContent>

					<TabsContent value="audio" className="space-y-4">
						<AudioRecorder
							onRecordingComplete={handleAudioRecordingComplete}
							onError={handleAudioError}
							disabled={disabled || isSubmitting}
							sessionId={""}
							questionId={""}
						/>

						{audioBlob && (
							<div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
								<p className="text-sm text-green-800">
									✓ Audio recorded successfully (
									{Math.round(audioBlob.size / 1024)} KB)
								</p>
							</div>
						)}
					</TabsContent>
				</Tabs>

				<div className="flex justify-end pt-4">
					<Button
						onClick={handleSubmit}
						disabled={disabled || isSubmitting || !canSubmit()}
						className="min-w-[120px]"
					>
						{isSubmitting ? (
							<>
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
								Submitting...
							</>
						) : (
							"Submit Response"
						)}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
