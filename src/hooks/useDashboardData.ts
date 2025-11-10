"use client";

import type { AuthUser } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { createClient } from "@/infrastructure/supabase/client";
import type { Tables } from "@/types/database";

export interface DashboardStats {
	totalDrills: number;
	completedDrills: number;
	averageScore: number;
	currentStreak: number;
	weeklyProgress: {
		totalDrills: number;
		completedDrills: number;
		averageScore: number;
		streakDays: number;
	};
}

export interface RecentActivity {
	id: string;
	title: string;
	score?: number;
	status: "completed" | "in_progress" | "pending";
	completedAt?: string;
	createdAt: string;
}

export interface DashboardData {
	stats: DashboardStats;
	recentActivity: RecentActivity[];
	loading: boolean;
	error: string | null;
}

export function useDashboardData(user: AuthUser | null): DashboardData {
	const [data, setData] = useState<DashboardData>({
		stats: {
			totalDrills: 0,
			completedDrills: 0,
			averageScore: 0,
			currentStreak: 0,
			weeklyProgress: {
				totalDrills: 0,
				completedDrills: 0,
				averageScore: 0,
				streakDays: 0,
			},
		},
		recentActivity: [],
		loading: true,
		error: null,
	});

	useEffect(() => {
		if (!user) {
			setData((prev) => ({ ...prev, loading: false }));
			return;
		}

		async function fetchDashboardData() {
			try {
				const supabase = createClient();

				// Fetch all evaluation results for the user
				const { data: evaluations, error: evaluationsError } = (await supabase
					.from("evaluation_results")
					.select("*")
					.eq("user_id", user?.id ?? "")
					.order("created_at", { ascending: false })) as {
					data: Tables<"evaluation_results">[] | null;
					error: Error | null;
				};

				if (evaluationsError) {
					throw evaluationsError;
				}

				// Calculate statistics
				const totalDrills = evaluations?.length || 0;
				const completedDrills =
					evaluations?.filter((e) => e.status === "COMPLETED").length || 0;
				const completedEvaluations =
					evaluations?.filter(
						(e) => e.status === "COMPLETED" && e.score !== null,
					) || [];
				const averageScore =
					completedEvaluations.length > 0
						? Math.round(
								completedEvaluations.reduce(
									(sum, e) => sum + (e.score || 0),
									0,
								) / completedEvaluations.length,
							)
						: 0;

				// Calculate current streak (consecutive days with completed drills)
				const currentStreak = calculateStreak(evaluations || []);

				// Calculate weekly progress (last 7 days)
				const oneWeekAgo = new Date();
				oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

				const weeklyEvaluations =
					evaluations?.filter(
						(e) => new Date(e.created_at ?? "") >= oneWeekAgo,
					) || [];

				const weeklyCompleted = weeklyEvaluations.filter(
					(e) => e.status === "COMPLETED",
				);
				const weeklyCompletedWithScores = weeklyCompleted.filter(
					(e) => e.score !== null,
				);
				const weeklyAverageScore =
					weeklyCompletedWithScores.length > 0
						? Math.round(
								weeklyCompletedWithScores.reduce(
									(sum, e) => sum + (e.score || 0),
									0,
								) / weeklyCompletedWithScores.length,
							)
						: 0;

				const weeklyStreak = calculateStreak(weeklyEvaluations);

				// Generate recent activity
				const recentActivity: RecentActivity[] = (evaluations || [])
					.slice(0, 5)
					.map((evaluation) => ({
						id: evaluation.id,
						title: getEvaluationTitle(evaluation),
						score: evaluation.score || undefined,
						status:
							evaluation.status === "COMPLETED"
								? "completed"
								: evaluation.status === "PROCESSING"
									? "in_progress"
									: "pending",
						completedAt:
							evaluation.status === "COMPLETED"
								? evaluation.updated_at || undefined
								: undefined,
						createdAt: evaluation.created_at || "",
					}));

				setData({
					stats: {
						totalDrills,
						completedDrills,
						averageScore,
						currentStreak,
						weeklyProgress: {
							totalDrills: weeklyEvaluations.length,
							completedDrills: weeklyCompleted.length,
							averageScore: weeklyAverageScore,
							streakDays: weeklyStreak,
						},
					},
					recentActivity,
					loading: false,
					error: null,
				});
			} catch (error) {
				console.error("Error fetching dashboard data:", error);
				setData((prev) => ({
					...prev,
					loading: false,
					error:
						error instanceof Error
							? error.message
							: "Failed to load dashboard data",
				}));
			}
		}

		fetchDashboardData();
	}, [user]);

	return data;
}

function calculateStreak(evaluations: Tables<"evaluation_results">[]): number {
	if (!evaluations || evaluations.length === 0) return 0;

	// Group evaluations by date
	const evaluationsByDate = new Map<string, Tables<"evaluation_results">[]>();

	evaluations.forEach((evaluation) => {
		if (!evaluation.created_at) return;
		const date = new Date(evaluation.created_at).toDateString();
		if (!evaluationsByDate.has(date)) {
			evaluationsByDate.set(date, []);
		}
		evaluationsByDate.get(date)?.push(evaluation);
	});

	// Sort dates in descending order
	const sortedDates = Array.from(evaluationsByDate.keys()).sort(
		(a, b) => new Date(b).getTime() - new Date(a).getTime(),
	);

	let streak = 0;
	const today = new Date();

	for (let i = 0; i < sortedDates.length; i++) {
		const date = new Date(sortedDates[i]);
		const dayEvaluations = evaluationsByDate.get(sortedDates[i]) || [];

		// Check if there's at least one completed evaluation on this day
		const hasCompleted = dayEvaluations.some((e) => e.status === "COMPLETED");

		if (hasCompleted) {
			// Check if this date is consecutive (within 1 day of the previous date or today)
			const expectedDate = new Date(today);
			expectedDate.setDate(today.getDate() - i);

			// Allow for some flexibility in date matching (same day or previous day)
			const dateDiff =
				Math.abs(date.getTime() - expectedDate.getTime()) /
				(1000 * 60 * 60 * 24);

			if (dateDiff <= 1) {
				streak++;
			} else {
				break;
			}
		} else {
			break;
		}
	}

	return streak;
}

function getEvaluationTitle(evaluation: Tables<"evaluation_results">): string {
	// Try to extract a meaningful title from the evaluation
	if (evaluation.response_text) {
		// Use first 50 characters of the response as title
		return evaluation.response_text.length > 50
			? `${evaluation.response_text.substring(0, 50)}...`
			: evaluation.response_text;
	}

	// Fallback to generic titles based on content pack or type
	if (evaluation.content_pack_id) {
		return "Interview Practice Session";
	}

	return evaluation.response_type === "audio"
		? "Audio Response Practice"
		: "Text Response Practice";
}
