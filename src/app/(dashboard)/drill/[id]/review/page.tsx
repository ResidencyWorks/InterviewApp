"use client";

import {
	ArrowLeft,
	Award,
	BarChart3,
	Clock,
	Target,
	TrendingUp,
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks";

interface EvaluationItem {
	id: string;
	title: string;
	description?: string;
	category?: string;
	difficulty?: string;
	estimatedMinutes?: number;
	competencies?: string[];
	interviewFormat?: string;
	questions?: unknown[];
}

interface DrillStats {
	totalAttempts: number;
	bestScore: number;
	averageScore: number;
	worstScore: number;
	totalTimeMinutes: number;
	latestCompletion: string | null;
	scoreTrend: string;
	questionStats: Record<
		string,
		{ attempts: number; bestScore: number; averageScore: number }
	>;
	recentScores: number[];
}

interface EvaluationData {
	id: string;
	title: string;
	description: string;
	category?: string;
	difficulty?: string;
	estimatedMinutes?: number;
	competencies?: string[];
	interviewFormat?: string;
	totalQuestions: number;
}

export default function DrillReviewPage() {
	const params = useParams();
	const router = useRouter();
	const searchParams = useSearchParams();
	const { user, loading: authLoading } = useAuth();

	const [loading, setLoading] = React.useState(true);
	const [error, setError] = React.useState<string | null>(null);
	const [stats, setStats] = React.useState<DrillStats | null>(null);
	const [evaluationData, setEvaluationData] =
		React.useState<EvaluationData | null>(null);

	const drillId = params.id as string;
	const evaluationId = searchParams.get("evaluation") || drillId;

	// Fetch drill statistics
	React.useEffect(() => {
		const fetchData = async () => {
			if (!user || authLoading) return;

			setLoading(true);
			setError(null);

			try {
				// Fetch statistics
				const statsResponse = await fetch(
					`/api/drill/stats?drill_id=${evaluationId}`,
				);
				if (!statsResponse.ok) {
					throw new Error("Failed to fetch drill statistics");
				}
				const statsResult = await statsResponse.json();
				setStats(statsResult.data?.stats);

				// Fetch evaluation metadata
				const evalResponse = await fetch(
					"/api/content-packs/active/evaluations",
				);
				if (evalResponse.ok) {
					const evalResult = await evalResponse.json();
					const evaluations = (evalResult.data?.evaluations ||
						[]) as EvaluationItem[];
					const evaluation = evaluations.find((e) => e.id === evaluationId);
					if (evaluation) {
						setEvaluationData({
							id: evaluation.id,
							title: evaluation.title,
							description: evaluation.description || "",
							category: evaluation.category,
							difficulty: evaluation.difficulty,
							estimatedMinutes: evaluation.estimatedMinutes,
							competencies: evaluation.competencies,
							interviewFormat: evaluation.interviewFormat,
							totalQuestions: evaluation.questions?.length || 0,
						});
					}
				}
			} catch (err) {
				console.error("Failed to fetch drill review data:", err);
				setError(
					err instanceof Error ? err.message : "Failed to load review data",
				);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [user, authLoading, evaluationId]);

	const getDifficultyColor = (difficulty?: string) => {
		switch (difficulty) {
			case "beginner":
				return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
			case "intermediate":
				return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
			case "hard":
				return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
			default:
				return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
		}
	};

	const getTrendIcon = (trend: string) => {
		switch (trend) {
			case "improving":
				return <TrendingUp className="w-4 h-4 text-green-600" />;
			case "declining":
				return <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />;
			default:
				return <BarChart3 className="w-4 h-4 text-gray-600" />;
		}
	};

	const getTrendText = (trend: string) => {
		switch (trend) {
			case "improving":
				return "Improving";
			case "declining":
				return "Needs Work";
			case "stable":
				return "Stable";
			default:
				return "Not enough data";
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-background p-6">
				<div className="max-w-6xl mx-auto space-y-6">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-40 w-full" />
					<Skeleton className="h-60 w-full" />
				</div>
			</div>
		);
	}

	if (error || !stats || !evaluationData) {
		return (
			<div className="min-h-screen bg-background p-6">
				<div className="max-w-6xl mx-auto space-y-6">
					<Alert variant="destructive">
						<AlertDescription>
							{error || "Failed to load drill review data"}
						</AlertDescription>
					</Alert>
					<Button onClick={() => router.push("/drill")}>
						<ArrowLeft className="w-4 h-4 mr-2" />
						Back to Drills
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background p-6">
			<div className="max-w-6xl mx-auto space-y-6">
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
						<h1 className="text-3xl font-bold text-foreground">
							{evaluationData.title}
						</h1>
						<p className="text-muted-foreground mt-1">
							{evaluationData.description}
						</p>
					</div>
				</div>

				{/* Metadata Badges */}
				<div className="flex flex-wrap gap-2">
					{evaluationData.difficulty && (
						<Badge
							variant="outline"
							className={getDifficultyColor(evaluationData.difficulty)}
						>
							{evaluationData.difficulty.charAt(0).toUpperCase() +
								evaluationData.difficulty.slice(1)}
						</Badge>
					)}
					{evaluationData.category && (
						<Badge variant="outline" className="capitalize">
							{evaluationData.category}
						</Badge>
					)}
					{evaluationData.interviewFormat && (
						<Badge variant="outline" className="uppercase">
							{evaluationData.interviewFormat}
						</Badge>
					)}
				</div>

				{/* Overall Performance Summary */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Award className="w-5 h-5" />
							Overall Performance
						</CardTitle>
						<CardDescription>
							Your performance summary across all attempts
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
							<div className="text-center space-y-2">
								<div className="text-4xl font-bold text-green-600 dark:text-green-400">
									{stats.bestScore}%
								</div>
								<div className="text-sm text-muted-foreground">Best Score</div>
							</div>
							<div className="text-center space-y-2">
								<div className="text-4xl font-bold">{stats.averageScore}%</div>
								<div className="text-sm text-muted-foreground">
									Average Score
								</div>
							</div>
							<div className="text-center space-y-2">
								<div className="text-4xl font-bold">{stats.totalAttempts}</div>
								<div className="text-sm text-muted-foreground">
									Total Attempts
								</div>
							</div>
							<div className="text-center space-y-2">
								<div className="text-4xl font-bold">
									{stats.totalTimeMinutes}
								</div>
								<div className="text-sm text-muted-foreground">
									Minutes Spent
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Score Trend */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							{getTrendIcon(stats.scoreTrend)}
							Performance Trend
						</CardTitle>
						<CardDescription>
							Your recent performance trend (last 5 attempts)
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<span className="text-lg font-semibold">
									{getTrendText(stats.scoreTrend)}
								</span>
								<Badge
									variant="outline"
									className={
										stats.scoreTrend === "improving"
											? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
											: stats.scoreTrend === "declining"
												? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
												: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
									}
								>
									{stats.scoreTrend.replace("_", " ")}
								</Badge>
							</div>
							{stats.recentScores.length > 0 && (
								<div className="space-y-2">
									<div className="text-sm text-muted-foreground">
										Recent Scores (most recent first):
									</div>
									<div className="flex gap-2">
										{stats.recentScores.map((score, index) => (
											<div
												key={`attempt-${stats.totalAttempts - index}`}
												className="flex-1 text-center p-3 rounded-lg bg-muted"
											>
												<div className="text-2xl font-bold">{score}%</div>
												<div className="text-xs text-muted-foreground">
													Attempt {stats.totalAttempts - index}
												</div>
											</div>
										))}
									</div>
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Question-Level Performance */}
				{Object.keys(stats.questionStats).length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Target className="w-5 h-5" />
								Question Performance
							</CardTitle>
							<CardDescription>
								Performance breakdown by question
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								{Object.entries(stats.questionStats).map(
									([questionId, qStats]) => (
										<div
											key={questionId}
											className="p-4 rounded-lg border bg-card"
										>
											<div className="flex items-center justify-between mb-3">
												<div className="font-medium text-sm truncate flex-1">
													Question: {questionId}
												</div>
												<Badge variant="outline" className="ml-2">
													{qStats.attempts}{" "}
													{qStats.attempts === 1 ? "attempt" : "attempts"}
												</Badge>
											</div>
											<div className="grid grid-cols-2 gap-4 text-sm">
												<div>
													<div className="text-muted-foreground text-xs mb-1">
														Best Score
													</div>
													<div className="text-lg font-semibold text-green-600 dark:text-green-400">
														{qStats.bestScore}%
													</div>
												</div>
												<div>
													<div className="text-muted-foreground text-xs mb-1">
														Average Score
													</div>
													<div className="text-lg font-semibold">
														{qStats.averageScore}%
													</div>
												</div>
											</div>
											<Progress
												value={qStats.averageScore}
												className="h-2 mt-3"
											/>
										</div>
									),
								)}
							</div>
						</CardContent>
					</Card>
				)}

				{/* Competencies (if available) */}
				{evaluationData.competencies &&
					evaluationData.competencies.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle>Competencies Covered</CardTitle>
								<CardDescription>
									Skills and competencies evaluated in this drill
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="flex flex-wrap gap-2">
									{evaluationData.competencies.map((competency) => (
										<Badge
											key={competency}
											variant="secondary"
											className="capitalize"
										>
											{competency.replace(/_/g, " ")}
										</Badge>
									))}
								</div>
							</CardContent>
						</Card>
					)}

				{/* Action Buttons */}
				<Card>
					<CardContent className="pt-6">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
							<Button
								variant="outline"
								onClick={() =>
									router.push(`/drill/${drillId}?evaluation=${evaluationId}`)
								}
								className="w-full"
							>
								<Target className="w-4 h-4 mr-2" />
								Practice Again
							</Button>
							<Button
								variant="outline"
								onClick={() => router.push("/drill")}
								className="w-full"
							>
								<ArrowLeft className="w-4 h-4 mr-2" />
								Browse All Drills
							</Button>
							<Button
								onClick={() => router.push("/dashboard")}
								className="w-full"
							>
								Go to Dashboard
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Last Completion Date */}
				{stats.latestCompletion && (
					<div className="text-center text-sm text-muted-foreground">
						Last completed on{" "}
						{new Date(stats.latestCompletion).toLocaleDateString("en-US", {
							year: "numeric",
							month: "long",
							day: "numeric",
							hour: "2-digit",
							minute: "2-digit",
						})}
					</div>
				)}
			</div>
		</div>
	);
}
