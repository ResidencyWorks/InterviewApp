"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
import type { DrillProgress } from "@/hooks/useDrillProgress";

interface Evaluation {
	id: string;
	title: string;
	description: string;
	difficulty?: "beginner" | "intermediate" | "hard";
	estimatedMinutes?: number;
	category?: string;
	competencies?: string[];
	interviewFormat?: string;
	questions: Array<{
		id: string;
		text: string;
		type: string;
		difficulty?: string;
		estimatedMinutes?: number;
		tags?: string[];
		competency?: string;
	}>;
}

export default function DrillPage() {
	const { user, loading: authLoading } = useAuth();
	const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [drillProgresses, setDrillProgresses] = useState<
		Record<string, DrillProgress>
	>({});
	const [drillStats, setDrillStats] = useState<
		Record<
			string,
			{
				totalAttempts: number;
				bestScore: number;
				averageScore: number;
				totalTimeMinutes: number;
				latestCompletion: string | null;
				scoreTrend: string;
			}
		>
	>({});
	// Fetch evaluations from active content pack
	useEffect(() => {
		const fetchEvaluations = async () => {
			if (!user || authLoading) return;

			setLoading(true);
			setError(null);

			try {
				const response = await fetch("/api/content-packs/active/evaluations");
				if (!response.ok) {
					throw new Error("Failed to fetch evaluations");
				}

				const result = await response.json();
				// The API wraps the response in a 'data' property
				const evaluations = result.data?.evaluations || [];

				setEvaluations(evaluations);

				if (evaluations.length === 0) {
					setError(
						"No active content pack found. Please activate a content pack in the admin panel.",
					);
				}
			} catch (err) {
				console.error("Failed to fetch evaluations:", err);
				setError(
					err instanceof Error ? err.message : "Failed to load evaluations",
				);
			} finally {
				setLoading(false);
			}
		};

		fetchEvaluations();
	}, [user, authLoading]);

	// Fetch progress for all evaluations
	useEffect(() => {
		const fetchAllProgress = async () => {
			if (!user || authLoading || evaluations.length === 0) return;

			const progressMap: Record<string, DrillProgress> = {};

			await Promise.all(
				evaluations.map(async (evaluation) => {
					try {
						const response = await fetch(
							`/api/drill/progress?drill_id=${evaluation.id}`,
						);
						if (response.ok) {
							const result = await response.json();
							// The API wraps the response in a 'data' property
							const progress = result.data?.progress || result.progress;
							if (progress) {
								progressMap[evaluation.id] = progress;
							}
						}
					} catch (err) {
						console.error(
							`Failed to fetch progress for ${evaluation.id}:`,
							err,
						);
					}
				}),
			);

			setDrillProgresses(progressMap);
		};

		fetchAllProgress();
	}, [user, authLoading, evaluations]);

	// Fetch statistics for completed drills
	useEffect(() => {
		const fetchAllStats = async () => {
			if (!user || authLoading || evaluations.length === 0) return;

			const statsMap: Record<string, any> = {};

			await Promise.all(
				evaluations.map(async (evaluation) => {
					// Only fetch stats for completed drills
					const progress = drillProgresses[evaluation.id];
					if (progress?.completed_at) {
						try {
							const response = await fetch(
								`/api/drill/stats?drill_id=${evaluation.id}`,
							);
							if (response.ok) {
								const result = await response.json();
								if (result.data?.stats) {
									statsMap[evaluation.id] = result.data.stats;
								}
							}
						} catch (err) {
							console.error(`Failed to fetch stats for ${evaluation.id}:`, err);
						}
					}
				}),
			);

			setDrillStats(statsMap);
		};

		fetchAllStats();
	}, [user, authLoading, evaluations, drillProgresses]);

	// Calculate progress statistics
	const completedCount = Object.values(drillProgresses).filter(
		(p) => p.completed_at,
	).length;
	const inProgressCount = Object.values(drillProgresses).filter(
		(p) => !p.completed_at && p.completed_questions > 0,
	).length;

	return (
		<div className="min-h-screen bg-background p-6">
			<div className="max-w-6xl mx-auto space-y-6">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-foreground">
							Interview Drills
						</h1>
						<p className="text-muted-foreground">
							Practice with interview questions from the active content pack.
						</p>
					</div>
					<Button asChild>
						<Link href="/dashboard">Back to Dashboard</Link>
					</Button>
				</div>

				{/* Error State */}
				{error && (
					<Alert variant="destructive">
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				{/* Loading State */}
				{loading && (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{[1, 2, 3].map((i) => (
							<Card key={i}>
								<CardHeader>
									<Skeleton className="h-6 w-3/4" />
									<Skeleton className="h-4 w-full mt-2" />
								</CardHeader>
								<CardContent>
									<Skeleton className="h-10 w-full" />
								</CardContent>
							</Card>
						))}
					</div>
				)}

				{/* Drills Grid */}
				{!loading && evaluations.length > 0 && (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{evaluations.map((evaluation) => {
							const progress = drillProgresses[evaluation.id];
							const stats = drillStats[evaluation.id];
							const totalQuestions = evaluation.questions.length;
							const completedQuestions = progress?.completed_questions || 0;
							const isCompleted = progress?.completed_at != null;
							const progressPercentage =
								totalQuestions > 0
									? (completedQuestions / totalQuestions) * 100
									: 0;

							// Difficulty badge styling
							const getDifficultyColor = (difficulty?: string) => {
								switch (difficulty) {
									case "beginner":
										return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
									case "intermediate":
										return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
									case "hard":
										return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
									default:
										return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400";
								}
							};

							return (
								<Card
									key={evaluation.id}
									className="hover:shadow-lg transition-shadow"
								>
									<CardHeader>
										<div className="flex items-start justify-between gap-2">
											<div className="flex-1">
												<div className="flex items-center gap-2 mb-2">
													<CardTitle className="text-lg">
														{evaluation.title}
													</CardTitle>
												</div>
												<CardDescription className="mt-1">
													{evaluation.description}
												</CardDescription>
												{/* Metadata badges */}
												<div className="flex flex-wrap gap-2 mt-3">
													{evaluation.difficulty && (
														<Badge
															variant="outline"
															className={getDifficultyColor(
																evaluation.difficulty,
															)}
														>
															{evaluation.difficulty.charAt(0).toUpperCase() +
																evaluation.difficulty.slice(1)}
														</Badge>
													)}
													{evaluation.category && (
														<Badge variant="outline" className="capitalize">
															{evaluation.category}
														</Badge>
													)}
													{evaluation.interviewFormat && (
														<Badge variant="outline" className="uppercase">
															{evaluation.interviewFormat}
														</Badge>
													)}
												</div>
											</div>
										</div>
									</CardHeader>
									<CardContent className="space-y-4">
										<div className="flex items-center justify-between text-sm text-muted-foreground">
											<div className="flex items-center gap-3">
												<span>{totalQuestions} question(s)</span>
												{evaluation.estimatedMinutes && (
													<span>• {evaluation.estimatedMinutes} min</span>
												)}
											</div>
											{isCompleted && (
												<Badge
													variant="outline"
													className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
												>
													Completed
												</Badge>
											)}
										</div>

										{/* Competencies */}
										{evaluation.competencies &&
											evaluation.competencies.length > 0 && (
												<div className="text-xs text-muted-foreground">
													<span className="font-medium">Competencies: </span>
													{evaluation.competencies
														.map((c) => c.replace(/_/g, " "))
														.join(", ")}
												</div>
											)}

										{/* Progress Bar */}
										{progress && !isCompleted && (
											<div className="space-y-2">
												<div className="flex items-center justify-between text-xs text-muted-foreground">
													<span>Progress</span>
													<span>
														{completedQuestions} / {totalQuestions}
													</span>
												</div>
												<Progress value={progressPercentage} className="h-2" />
											</div>
										)}

										{/* Statistics for completed drills */}
										{isCompleted && stats && (
											<div className="space-y-3 pt-2 border-t">
												<div className="grid grid-cols-2 gap-3 text-sm">
													<div className="space-y-1">
														<div className="text-muted-foreground text-xs">
															Best Score
														</div>
														<div className="font-semibold text-lg text-green-600 dark:text-green-400">
															{stats.bestScore}%
														</div>
													</div>
													<div className="space-y-1">
														<div className="text-muted-foreground text-xs">
															Average Score
														</div>
														<div className="font-semibold text-lg">
															{stats.averageScore}%
														</div>
													</div>
													<div className="space-y-1">
														<div className="text-muted-foreground text-xs">
															Attempts
														</div>
														<div className="font-semibold">
															{stats.totalAttempts}
														</div>
													</div>
													<div className="space-y-1">
														<div className="text-muted-foreground text-xs">
															Time Spent
														</div>
														<div className="font-semibold">
															{stats.totalTimeMinutes} min
														</div>
													</div>
												</div>
												{stats.latestCompletion && (
													<div className="text-xs text-muted-foreground">
														Last completed:{" "}
														{new Date(
															stats.latestCompletion,
														).toLocaleDateString()}
													</div>
												)}
											</div>
										)}

										<div className="flex space-x-2">
											{isCompleted ? (
												<>
													<Button variant="outline" className="flex-1" asChild>
														<Link
															href={`/drill/${evaluation.id}/review?evaluation=${evaluation.id}`}
														>
															View Stats
														</Link>
													</Button>
													<Button variant="outline" className="flex-1" asChild>
														<Link
															href={`/drill/${evaluation.questions[0]?.id}?evaluation=${evaluation.id}`}
														>
															Practice Again
														</Link>
													</Button>
												</>
											) : progress && completedQuestions > 0 ? (
												<Button className="flex-1" asChild>
													<Link
														href={`/drill/${progress.current_question_id}?evaluation=${evaluation.id}`}
													>
														Resume
													</Link>
												</Button>
											) : (
												<Button className="flex-1" asChild>
													<Link
														href={`/drill/${evaluation.questions[0]?.id}?evaluation=${evaluation.id}`}
													>
														Start Drill
													</Link>
												</Button>
											)}
										</div>
									</CardContent>
								</Card>
							);
						})}
					</div>
				)}

				{/* Progress Summary */}
				{!loading && evaluations.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle>Your Progress</CardTitle>
							<CardDescription>
								Track your learning journey and see how you're improving
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
								<div className="text-center">
									<div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
										{completedCount}
									</div>
									<div className="text-sm text-muted-foreground">Completed</div>
								</div>
								<div className="text-center">
									<div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
										{inProgressCount}
									</div>
									<div className="text-sm text-muted-foreground">
										In Progress
									</div>
								</div>
								<div className="text-center">
									<div className="text-2xl font-bold text-green-600 dark:text-green-400">
										{evaluations.length}
									</div>
									<div className="text-sm text-muted-foreground">
										Total Drills
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
