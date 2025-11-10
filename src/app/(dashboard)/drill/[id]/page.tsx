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
			<div className="min-h-screen bg-background p-6">
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
				// Estimate duration from blob size: ~64kbps = 8KB/s for compressed audio
				// This is a rough estimate; server will validate actual duration
				audioDurationSeconds = Math.max(
					1,
					Math.round(data.audioBlob.size / 8192),
				);
				console.log(
					"📊 Estimated audio duration:",
					audioDurationSeconds,
					"seconds from blob size:",
					data.audioBlob.size,
					"bytes",
				);
			}

			// Use FormData for audio uploads to avoid size limits with base64 encoding
			let body: FormData | string;
			let contentType: string | undefined;

			if (data.type === "audio" && data.audioBlob) {
				// Send audio as FormData with multipart encoding (much more efficient than base64)
				body = new FormData();
				body.append("audioFile", data.audioBlob, "recording.wav");
				body.append("questionId", questionId);
				body.append("userId", user?.id ?? "anonymous");
				body.append(
					"metadata",
					JSON.stringify({
						contentPackId: "default",
						responseType: data.type,
						questionTitle: question.title,
						questionCategory: question.category,
						questionDifficulty: question.difficulty,
					}),
				);
			} else {
				// Send text as JSON
				body = JSON.stringify({
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
				});
				contentType = "application/json";
			}

			console.log("📤 Sending evaluation request:", {
				questionId,
				responseType: data.type,
				hasContent: data.type === "text",
				hasAudio: data.type === "audio" && !!data.audioBlob,
				contentLength: data.type === "text" ? data.content.length : "FormData",
				audioUrlType: data.type === "audio" ? "multipart" : "json",
				metadata: {
					contentPackId: "default",
					responseType: data.type,
					questionTitle: question.title,
					questionCategory: question.category,
					questionDifficulty: question.difficulty,
				},
			});

			const fetchOptions: RequestInit = {
				method: "POST",
				body,
			};

			if (contentType) {
				fetchOptions.headers = { "Content-Type": contentType };
			}
			// For FormData, don't set Content-Type header - fetch will set it with boundary

			const response = await fetch("/api/evaluate", fetchOptions);

			if (!response.ok) {
				const errorData =
					response.status === 500
						? {}
						: await response.json().catch(() => ({}));
				throw new Error(
					errorData.message || `Evaluation failed: ${response.statusText}`,
				);
			}

			let result: {
				success: boolean;
				data?: {
					feedback: Record<string, unknown>;
					submissionId: string;
					processingTimeMs: number;
					status: { status: string };
				};
			} | null;
			try {
				result = await response.json();
			} catch (parseErr) {
				console.error("Failed to parse response:", parseErr);
				throw new Error("Invalid response from evaluation service");
			}

			if (!result) {
				throw new Error("Invalid response format from evaluation service");
			}

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
				const baseScore = (feedback.score as number) || 0;
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
					feedback: (feedback.feedback as string) || "No feedback available",
					score: baseScore,
					status: "COMPLETED",
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
					// UI extras for M0 demo
					category_flags: [
						{
							name: "Conciseness",
							passFlag: clarity >= 70 ? "PASS" : "FLAG",
							note: "Keep sentences short and emphasize key points early.",
						},
						{
							name: "Examples",
							passFlag: content >= 70 ? "PASS" : "FLAG",
							note: "Ground claims with brief, concrete examples.",
						},
						{
							name: "Signposting",
							passFlag: structure >= 70 ? "PASS" : "FLAG",
							note: "Outline your answer structure up front (First, Then, Finally).",
						},
						{
							name: "Pace",
							passFlag: wpm >= 120 && wpm <= 180 ? "PASS" : "FLAG",
							note: "Aim for 130–160 WPM to maintain clarity.",
						},
						{
							name: "Filler words",
							passFlag: Math.random() > 0.3 ? "PASS" : "FLAG",
							note: "Reduce 'um', 'like', and pauses; brief silence beats filler.",
						},
						{
							name: "Relevance",
							passFlag: content >= 75 ? "PASS" : "FLAG",
							note: "Tie each point back to the question explicitly.",
						},
						{
							name: "Confidence",
							passFlag: delivery >= 75 ? "PASS" : "FLAG",
							note: "Use active voice; avoid hedging language where not needed.",
						},
					],
					what_changed: [
						"Tightened intro and added clear thesis",
						"Inserted concrete example supporting the main claim",
						"Improved signposting for section transitions",
					],
					practice_rule:
						"Use the 30-60-90 structure: thesis in 30s, depth in 60s, recap in 90s.",
				};

				console.log("🎯 Setting evaluation result:", {
					score: evaluationResult.score,
					status: evaluationResult.status,
					categories: evaluationResult.categories,
					feedback: evaluationResult.feedback,
					fullObject: evaluationResult,
				});
				setEvaluationResult(evaluationResult);

				// Persist evaluation to backend (non-blocking)
				try {
					void fetch("/api/evaluations", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							id: evaluationResult.id,
							user_id: evaluationResult.user_id,
							content_pack_id: evaluationResult.content_pack_id,
							response_text: evaluationResult.response_text,
							response_audio_url: evaluationResult.response_audio_url,
							response_type: evaluationResult.response_type,
							duration_seconds: evaluationResult.duration_seconds,
							word_count: evaluationResult.word_count,
							wpm: evaluationResult.wpm,
							categories: evaluationResult.categories,
							feedback: evaluationResult.feedback,
							score: evaluationResult.score,
							status: evaluationResult.status,
						}),
					});
				} catch (persistError) {
					console.warn(
						"Failed to persist evaluation (non-blocking)",
						persistError,
					);
				}
			} else {
				throw new Error("Invalid response format from evaluation service");
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setIsSubmitting(false);
		}
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
		<div className="min-h-screen bg-background p-6">
			<div className="max-w-4xl mx-auto space-y-6">
				{/* Header */}
				<div className="flex items-center gap-4">
					<Button
						variant="outline"
						size="sm"
						onClick={() => router.push("/drill")}
					>
						<ArrowLeft className="w-4 h-4 mr-2" />
						Back to Drills
					</Button>
					<div className="flex-1">
						<h1 className="text-2xl font-bold text-foreground">
							{question.title}
						</h1>
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
							<div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
								<h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
									Tips:
								</h4>
								<ul className="list-disc list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
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
					<Card className="border-destructive">
						<CardContent className="p-4">
							<div className="text-destructive">
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
