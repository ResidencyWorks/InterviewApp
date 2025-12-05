"use client";

import { ArrowRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScorePopover } from "@/components/ui/score-popover";
import { cn } from "@/shared/utils";
import type {
	EvaluationCategories,
	EvaluationResult,
} from "@/types/evaluation";

export interface EvaluationResultDisplayProps {
	result: EvaluationResult;
	className?: string;
	onNextQuestion?: () => void;
	showNextButton?: boolean;
	nextButtonText?: string;
}

/**
 * EvaluationResultDisplay component shows evaluation results with detailed breakdown
 * @param result - Evaluation result data
 * @param className - Additional CSS classes
 */
export function EvaluationResultDisplay({
	result,
	className,
	onNextQuestion,
	showNextButton = true,
	nextButtonText = "Next Question",
}: EvaluationResultDisplayProps) {
	console.log("🔍 EvaluationResultDisplay received:", {
		status: result.status,
		score: result.score,
		scoreType: typeof result.score,
		hasFeedback: Boolean(result.feedback),
		hasCategories: Boolean(result.categories),
		fullResult: result,
	});
	const getStatusColor = (status: string) => {
		switch (status) {
			case "COMPLETED":
				return "bg-green-100 text-green-800";
			case "PROCESSING":
				return "bg-blue-100 text-blue-800";
			case "FAILED":
				return "bg-red-100 text-red-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	const getCategoryLabel = (category: keyof EvaluationCategories) => {
		const labels = {
			clarity: "Clarity",
			structure: "Structure",
			content: "Content",
			delivery: "Delivery",
		};
		return labels[category];
	};

	const getCategoryDescription = (category: keyof EvaluationCategories) => {
		const descriptions = {
			clarity: "How clearly you communicated your ideas",
			structure: "Organization and logical flow of your response",
			content: "Relevance and depth of your answer",
			delivery: "Confidence and presentation style",
		};
		return descriptions[category];
	};

	if (result.status === "PROCESSING") {
		return (
			<Card className={cn("w-full max-w-2xl mx-auto", className)}>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
						Evaluating Your Response
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground">
						Our AI is analyzing your response. This usually takes a few
						seconds...
					</p>
				</CardContent>
			</Card>
		);
	}

	if (result.status === "FAILED") {
		return (
			<Card
				className={cn("w-full max-w-2xl mx-auto border-red-200", className)}
			>
				<CardHeader>
					<CardTitle className="text-red-600">Evaluation Failed</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground mb-4">
						We encountered an error while evaluating your response.
					</p>
					{result.error_message && (
						<div className="p-3 bg-red-50 border border-red-200 rounded-md">
							<p className="text-sm text-red-800">{result.error_message}</p>
						</div>
					)}
				</CardContent>
			</Card>
		);
	}

	if (result.status !== "COMPLETED") {
		console.log("❌ EvaluationResultDisplay not rendering:", {
			status: result.status,
			score: result.score,
			reason: "status not completed",
		});
		return null;
	}

	return (
		<Card className={cn("w-full max-w-2xl mx-auto", className)}>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle>Evaluation Results</CardTitle>
					<Badge className={getStatusColor(result.status)}>
						{result.status}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Overall Score */}
				<div className="text-center">
					{typeof result.score === "number" ? (
						<ScorePopover
							score={result.score}
							categories={result.categories}
							feedback={result.feedback || undefined}
						>
							<div className="inline-block">
								<div className="text-4xl font-bold text-primary mb-2">
									{result.score}%
								</div>
								<div className="text-sm text-muted-foreground">
									Click for detailed breakdown
								</div>
							</div>
						</ScorePopover>
					) : (
						<div className="inline-block">
							<div className="text-4xl font-bold text-primary mb-2">N/A</div>
							<div className="text-sm text-muted-foreground">
								Score unavailable
							</div>
						</div>
					)}
				</div>

				{/* Category Breakdown (7 chips with popovers) */}
				<div className="space-y-4">
					<h3 className="text-lg font-semibold">Category Breakdown</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Render 4 numeric categories */}
						{result.categories &&
							Object.entries(result.categories).map(([category, score]) => (
								<div key={category} className="space-y-2">
									<div className="flex items-center justify-between">
										<span className="font-medium">
											{getCategoryLabel(category as keyof EvaluationCategories)}
										</span>
										<Badge variant="outline" className="font-semibold">
											{score}%
										</Badge>
									</div>
									<p className="text-sm text-muted-foreground">
										{getCategoryDescription(
											category as keyof EvaluationCategories,
										)}
									</p>
								</div>
							))}

						{/* Render additional pass/flag chips up to 7 total */}
						{result.category_flags?.slice(0, 7).map((flag) => (
							<Popover key={`${flag.name}-${flag.passFlag}`}>
								<PopoverTrigger asChild>
									<button
										type="button"
										className={cn(
											"flex items-center justify-between w-full border rounded-md px-3 py-2 text-left",
											flag.passFlag === "PASS"
												? "border-green-200 bg-green-50 text-green-800"
												: "border-yellow-200 bg-yellow-50 text-yellow-800",
										)}
										aria-label={`${flag.name} ${
											flag.passFlag === "PASS" ? "✅" : "⚠️"
										}`}
									>
										<span className="font-medium">{flag.name}</span>
										<span className="text-sm">
											{flag.passFlag === "PASS" ? "✅" : "⚠️"}
										</span>
									</button>
								</PopoverTrigger>
								<PopoverContent align="start" className="max-w-sm">
									<p className="text-sm text-muted-foreground whitespace-pre-wrap">
										{flag.note}
									</p>
								</PopoverContent>
							</Popover>
						))}
					</div>
				</div>

				{/* Feedback */}
				{result.feedback && (
					<div className="space-y-2">
						<h3 className="text-lg font-semibold">Detailed Feedback</h3>
						<div className="p-4 bg-muted rounded-lg prose prose-sm dark:prose-invert max-w-none">
							<ReactMarkdown remarkPlugins={[remarkGfm]}>
								{result.feedback}
							</ReactMarkdown>
						</div>
					</div>
				)}

				{/* What changed + Rule to practice next */}
				{(result.what_changed?.length || result.practice_rule) && (
					<div className="space-y-3">
						<h3 className="text-lg font-semibold">Improvements</h3>
						{result.what_changed && result.what_changed.length > 0 && (
							<ul className="list-disc list-inside space-y-1 text-sm">
								{result.what_changed.slice(0, 3).map((item) => (
									<li key={item}>{item}</li>
								))}
							</ul>
						)}
						{result.practice_rule && (
							<p className="text-sm text-muted-foreground">
								Rule to practice next: {result.practice_rule}
							</p>
						)}
					</div>
				)}

				{/* Metrics */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
					<div className="text-center">
						<div className="text-2xl font-bold text-primary">
							{result.word_count || 0}
						</div>
						<div className="text-xs text-muted-foreground">Words</div>
					</div>
					<div className="text-center">
						<div className="text-2xl font-bold text-primary">
							{result.wpm || 0}
						</div>
						<div className="text-xs text-muted-foreground">WPM</div>
					</div>
					<div className="text-center">
						<div className="text-2xl font-bold text-primary">
							{result.duration_seconds
								? Math.round(result.duration_seconds)
								: 0}
							s
						</div>
						<div className="text-xs text-muted-foreground">Duration</div>
					</div>
					<div className="text-center">
						<div className="text-2xl font-bold text-primary">
							{result.response_type === "audio" ? "🎤" : "✍️"}
						</div>
						<div className="text-xs text-muted-foreground">
							{result.response_type === "audio" ? "Audio" : "Text"}
						</div>
					</div>
				</div>

				{/* Next Question Button */}
				{showNextButton && onNextQuestion && (
					<div className="mt-6 flex justify-center">
						<Button onClick={onNextQuestion} size="lg" className="gap-2">
							{nextButtonText}
							<ArrowRight className="h-4 w-4" />
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
