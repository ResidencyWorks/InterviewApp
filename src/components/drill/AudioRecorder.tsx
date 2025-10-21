"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AudioRecorderProps {
	onRecordingComplete: (audioBlob: Blob) => void;
	onError?: (error: Error) => void;
	className?: string;
	disabled?: boolean;
}

/**
 * AudioRecorder component for recording user responses
 * @param onRecordingComplete - Callback when recording is complete
 * @param onError - Callback for recording errors
 * @param className - Additional CSS classes
 * @param disabled - Whether the recorder is disabled
 */
export function AudioRecorder({
	onRecordingComplete,
	onError,
	className,
	disabled = false,
}: AudioRecorderProps) {
	const [isRecording, setIsRecording] = React.useState(false);
	const [recordingTime, setRecordingTime] = React.useState(0);
	const [mediaRecorder, setMediaRecorder] =
		React.useState<MediaRecorder | null>(null);
	const [_audioChunks, setAudioChunks] = React.useState<Blob[]>([]);
	const intervalRef = React.useRef<NodeJS.Timeout | null>(null);

	const startRecording = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const recorder = new MediaRecorder(stream);
			const chunks: Blob[] = [];

			recorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					chunks.push(event.data);
				}
			};

			recorder.onstop = () => {
				const audioBlob = new Blob(chunks, { type: "audio/wav" });
				onRecordingComplete(audioBlob);
				stream.getTracks().forEach((track) => {
					track.stop();
				});
			};

			recorder.start();
			setMediaRecorder(recorder);
			setAudioChunks(chunks);
			setIsRecording(true);
			setRecordingTime(0);

			// Start timer
			intervalRef.current = setInterval(() => {
				setRecordingTime((prev) => prev + 1);
			}, 1000);
		} catch (error) {
			onError?.(error as Error);
		}
	};

	const stopRecording = () => {
		if (mediaRecorder && isRecording) {
			mediaRecorder.stop();
			setIsRecording(false);
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		}
	};

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	};

	React.useEffect(() => {
		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, []);

	return (
		<div className={cn("flex flex-col items-center space-y-4", className)}>
			<div className="text-center">
				<h3 className="text-lg font-semibold mb-2">Record Your Response</h3>
				<p className="text-sm text-muted-foreground mb-4">
					Click the microphone to start recording your answer
				</p>
			</div>

			<div className="flex flex-col items-center space-y-4">
				<Button
					onClick={isRecording ? stopRecording : startRecording}
					disabled={disabled}
					variant={isRecording ? "destructive" : "default"}
					size="lg"
					className={cn(
						"w-16 h-16 rounded-full",
						isRecording && "animate-pulse",
					)}
					aria-label={isRecording ? "Stop recording" : "Start recording"}
				>
					{isRecording ? (
						<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
							<title>Stop recording</title>
							<rect x="6" y="6" width="12" height="12" rx="2" />
						</svg>
					) : (
						<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
							<title>Start recording</title>
							<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
							<path d="M19 10v2a7 7 0 0 1-14 0v-2" />
							<line x1="12" y1="19" x2="12" y2="23" />
							<line x1="8" y1="23" x2="16" y2="23" />
						</svg>
					)}
				</Button>

				{isRecording && (
					<div className="text-center">
						<div className="text-2xl font-mono font-bold text-red-600">
							{formatTime(recordingTime)}
						</div>
						<p className="text-sm text-muted-foreground">
							Recording in progress...
						</p>
					</div>
				)}
			</div>

			{!isRecording && recordingTime === 0 && (
				<p className="text-xs text-muted-foreground text-center">
					Make sure your microphone is working and you're in a quiet environment
				</p>
			)}
		</div>
	);
}
