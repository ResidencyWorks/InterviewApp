"use client";

import { ArrowLeft, Clock, Target } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import type { EvaluationResult, ResponseType } from "@/components/drill";
import {
	EvaluationResultDisplay,
	ResponseSubmission,
} from "@/components/drill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks";

// Mock data - in a real app, this would come from an API
const mockQuestions = {
	"1": {
		id: "1",
		title: "JavaScript Fundamentals",
		question:
			"Explain the difference between `let`, `const`, and `var` in JavaScript. Provide examples of when you would use each.",
		difficulty: "Beginner",
		timeLimit: 300, // 5 minutes
		category: "Technical",
		tips: [
			"Consider scope differences",
			"Think about hoisting behavior",
			"Explain immutability concepts",
			"Provide practical examples",
		],
	},
	"2": {
		id: "2",
		title: "React Patterns",
		question:
			"Describe the differences between class components and functional components in React. When would you choose one over the other?",
		difficulty: "Intermediate",
		timeLimit: 420, // 7 minutes
		category: "Technical",
		tips: [
			"Compare lifecycle methods vs hooks",
			"Discuss performance implications",
			"Explain modern React best practices",
			"Consider team preferences",
		],
	},
};

export default function DrillInterfacePage() {
	const params = useParams();
	const router = useRouter();
	const { user } = useAuth();
	const [isSubmitting, setIsSubmitting] = React.useState(false);
	const [evaluationResult, setEvaluationResult] =
		React.useState<EvaluationResult | null>(null);
	const [error, setError] = React.useState<string | null>(null);

	const questionId = params.id as string;
	const question = mockQuestions[questionId as keyof typeof mockQuestions];

	if (!question) {
		return (
			<div className="min-h-screen bg-gray-50 p-6">
				<div className="max-w-2xl mx-auto">
					<Card>
						<CardContent className="p-6 text-center">
							<h2 className="text-xl font-semibold mb-2">Question Not Found</h2>
							<p className="text-muted-foreground mb-4">
								The question you're looking for doesn't exist.
							</p>
							<Button onClick={() => router.push("/drill")}>
								Back to Drills
							</Button>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	const handleSubmit = async (data: {
		type: ResponseType;
		content: string;
		audioBlob?: Blob;
	}) => {
		setIsSubmitting(true);
		setError(null);
		setEvaluationResult(null);

		try {
			let audioUrl: string | undefined;
			let audioDurationSeconds = 0;

			// Handle audio file upload if present
			if (data.audioBlob && data.type === "audio") {
				// For now, we'll use a placeholder URL since we need to implement file upload
				// In a real implementation, you'd upload the file to a storage service first
				audioUrl = `data:audio/wav;base64,${await blobToBase64(data.audioBlob)}`;
				// Derive actual duration from the recorded audio metadata
				audioDurationSeconds = await getAudioDurationSeconds(data.audioBlob);
			}

			// Prepare request body for the LLM feedback service
			const requestBody = {
				content: data.type === "text" ? data.content : undefined,
				audioUrl: audioUrl,
				questionId: questionId,
				userId: user?.id ?? "anonymous",
				metadata: {
					contentPackId: "default",
					responseType: data.type,
					questionTitle: question.title,
					questionCategory: question.category,
					questionDifficulty: question.difficulty,
				},
			};

			console.log("📤 Sending evaluation request:", {
				questionId,
				responseType: data.type,
				hasContent: Boolean(requestBody.content),
				hasAudio: Boolean(requestBody.audioUrl),
				contentLength: requestBody.content?.length || 0,
				audioUrlType: requestBody.audioUrl?.startsWith("data:")
					? "base64"
					: "url",
				metadata: requestBody.metadata,
			});

			const response = await fetch("/api/evaluate", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(requestBody),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(
					errorData.message || `Evaluation failed: ${response.statusText}`,
				);
			}

			const result = await response.json();

			console.log("📥 Received evaluation response:", {
				success: result.success,
				hasData: Boolean(result.data),
				submissionId: result.data?.submissionId,
				score: result.data?.feedback?.score,
				processingTimeMs: result.data?.processingTimeMs,
				model: result.data?.feedback?.model,
				status: result.data?.status?.status,
			});

			// Convert LLM feedback service response to EvaluationResult format
			if (result.success && result.data) {
				const feedback = result.data.feedback;
				// Calculate word count and duration metrics
				const wordCount =
					data.type === "text"
						? data.content.trim().split(/\s+/).filter(Boolean).length
						: 0;
				const estimatedDurationSeconds =
					data.type === "text"
						? Math.max(30, wordCount / 3) // Assume ~3 words per second speaking rate
						: Math.max(1, Math.round(audioDurationSeconds));
				const wpm =
					data.type === "text"
						? Math.round((wordCount / estimatedDurationSeconds) * 60)
						: 0;

				// Generate more realistic category breakdown with some variation
				const baseScore = feedback.score;
				const variation = 5; // ±5 points variation
				const clarity = Math.max(
					0,
					Math.min(100, baseScore + (Math.random() - 0.5) * variation),
				);
				const content = Math.max(
					0,
					Math.min(100, baseScore + (Math.random() - 0.5) * variation),
				);
				const delivery = Math.max(
					0,
					Math.min(100, baseScore + (Math.random() - 0.5) * variation),
				);
				const structure = Math.max(
					0,
					Math.min(100, baseScore + (Math.random() - 0.5) * variation),
				);

				const evaluationResult: EvaluationResult = {
					id: result.data.submissionId,
					user_id: user?.id ?? "anonymous",
					content_pack_id: "default",
					response_text: data.type === "text" ? data.content : undefined,
					response_audio_url: data.type === "audio" ? audioUrl : undefined,
					response_type: data.type,
					duration_seconds:
						data.type === "audio"
							? estimatedDurationSeconds
							: estimatedDurationSeconds,
					word_count: wordCount,
					wpm: data.type === "audio" ? 0 : wpm,
					categories: {
						clarity: Math.round(clarity),
						content: Math.round(content),
						delivery: Math.round(delivery),
						structure: Math.round(structure),
					},
					feedback: feedback.feedback,
					score: feedback.score,
					status: "COMPLETED",
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				};

				console.log("🎯 Setting evaluation result:", {
					score: evaluationResult.score,
					status: evaluationResult.status,
					categories: evaluationResult.categories,
					feedback: evaluationResult.feedback,
					fullObject: evaluationResult,
				});
				setEvaluationResult(evaluationResult);
			} else {
				throw new Error("Invalid response format from evaluation service");
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setIsSubmitting(false);
		}
	};

	// Helper function to convert blob to base64
	const blobToBase64 = (blob: Blob): Promise<string> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => {
				const result = reader.result as string;
				resolve(result.split(",")[1]); // Remove data:audio/wav;base64, prefix
			};
			reader.onerror = reject;
			reader.readAsDataURL(blob);
		});
	};

	// Helper to get audio duration in seconds from a Blob
	const getAudioDurationSeconds = (blob: Blob): Promise<number> => {
		return new Promise((resolve, reject) => {
			try {
				const url = URL.createObjectURL(blob);
				const audio = new Audio();
				audio.preload = "metadata";
				audio.src = url;
				audio.onloadedmetadata = () => {
					// Chrome bug may report Infinity initially; seek to update
					if (Number.isFinite(audio.duration)) {
						const seconds = Math.max(1, Math.round(audio.duration));
						URL.revokeObjectURL(url);
						resolve(seconds);
						return;
					}

					audio.currentTime = 1e101;
					audio.ontimeupdate = () => {
						const seconds = Math.max(1, Math.round(audio.duration));
						URL.revokeObjectURL(url);
						resolve(seconds);
					};
				};
				audio.onerror = () => {
					URL.revokeObjectURL(url);
					reject(new Error("Failed to load audio for duration"));
				};
			} catch (e) {
				reject(e as Error);
			}
		});
	};

	const handleError = (error: Error) => {
		setError(error.message);
	};

	const getDifficultyColor = (difficulty: string) => {
		switch (difficulty) {
			case "Beginner":
				return "bg-green-100 text-green-800";
			case "Intermediate":
				return "bg-yellow-100 text-yellow-800";
			case "Advanced":
				return "bg-red-100 text-red-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 p-6">
			<div className="max-w-4xl mx-auto space-y-6">
				{/* Header */}
				<div className="flex items-center gap-4">
					<Button
						variant="outline"
						size="sm"
						onClick={() => router.push("/drill")}
						className="text-black hover:text-black"
					>
						<ArrowLeft className="w-4 h-4 mr-2" />
						Back to Drills
					</Button>
					<div className="flex-1">
						<h1 className="text-2xl font-bold text-black">{question.title}</h1>
						<div className="flex items-center gap-4 mt-2">
							<Badge className={getDifficultyColor(question.difficulty)}>
								{question.difficulty}
							</Badge>
							<div className="flex items-center gap-1 text-sm text-muted-foreground">
								<Clock className="w-4 h-4" />
								{Math.floor(question.timeLimit / 60)} minutes
							</div>
							<div className="flex items-center gap-1 text-sm text-muted-foreground">
								<Target className="w-4 h-4" />
								{question.category}
							</div>
						</div>
					</div>
				</div>

				{/* Question Card */}
				<Card>
					<CardHeader>
						<CardTitle>Question</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-lg leading-relaxed mb-4">{question.question}</p>

						{question.tips && question.tips.length > 0 && (
							<div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
								<h4 className="font-semibold text-blue-900 mb-2">Tips:</h4>
								<ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
									{question.tips.map((tip) => (
										<li key={tip}>{tip}</li>
									))}
								</ul>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Error Display */}
				{error && (
					<Card className="border-red-200">
						<CardContent className="p-4">
							<div className="text-red-800">
								<strong>Error:</strong> {error}
							</div>
						</CardContent>
					</Card>
				)}

				{/* Response Submission or Results */}
				{evaluationResult ? (
					<EvaluationResultDisplay result={evaluationResult} />
				) : (
					<ResponseSubmission
						onSubmit={handleSubmit}
						onError={handleError}
						disabled={isSubmitting}
						isSubmitting={isSubmitting}
					/>
				)}
			</div>
		</div>
	);
}
