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
			// Create FormData for the API call
			const formData = new FormData();
			formData.append("response", data.content);
			formData.append("type", data.type);
			formData.append("content_pack_id", "default");

			if (data.audioBlob) {
				formData.append("audio", data.audioBlob, "recording.wav");
			}

			const response = await fetch("/api/evaluate", {
				method: "POST",
				body: formData,
			});

			if (!response.ok) {
				throw new Error(`Evaluation failed: ${response.statusText}`);
			}

			const result = await response.json();

			// Convert API response to EvaluationResult format
			const evaluationResult: EvaluationResult = {
				id: crypto.randomUUID(),
				user_id: "current-user", // TODO: Get from auth context
				content_pack_id: "default",
				response_text: data.type === "text" ? data.content : undefined,
				response_audio_url: data.type === "audio" ? "audio-url" : undefined,
				response_type: data.type,
				duration_seconds: result.duration,
				word_count: result.wordCount,
				wpm: result.wpm,
				categories: result.categories,
				feedback: result.feedback,
				score: result.score,
				status: "COMPLETED",
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			};

			setEvaluationResult(evaluationResult);
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
