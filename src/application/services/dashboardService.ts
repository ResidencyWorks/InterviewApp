import { serializeError } from "@/infrastructure/db/database-helpers";
import { createClient } from "@/infrastructure/supabase/client";
import type { AuthUser } from "@/types/auth";

export interface UserGoal {
	id: string;
	userId: string;
	title: string;
	description: string;
	targetValue: number;
	currentValue: number;
	unit: string;
	deadline?: string;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface ProgressData {
	goal: UserGoal | null;
	progressPercentage: number;
	remainingValue: number;
	estimatedCompletionDate?: string;
}

export class DashboardService {
	private supabase;

	constructor() {
		this.supabase = createClient();
	}

	/**
	 * Get user's daily goal and progress
	 */
	async getUserProgress(user: AuthUser): Promise<ProgressData> {
		try {
			// For now, we'll create a default daily goal if none exists
			// In a real app, you'd have a goals table
			const defaultGoal: UserGoal = {
				id: "default-daily-goal",
				userId: user.id,
				title: "Daily Practice Goal",
				description: "Complete practice sessions daily",
				targetValue: 4,
				currentValue: 0,
				unit: "drills",
				isActive: true,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};

			// Get today's completed drills
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const tomorrow = new Date(today);
			tomorrow.setDate(tomorrow.getDate() + 1);

			const { data: todayEvaluations, error } = await this.supabase
				.from("evaluation_results")
				.select("request_id, score, created_at")
				.eq("user_id", user.id)
				.gte("created_at", today.toISOString())
				.lt("created_at", tomorrow.toISOString());

			if (error) {
				const serialized = serializeError(error);
				console.error(
					"Error fetching today's evaluations:",
					JSON.stringify(serialized, null, 2),
				);
			}

			const currentValue = todayEvaluations?.length || 0;
			const progressPercentage = Math.min(
				(currentValue / defaultGoal.targetValue) * 100,
				100,
			);
			const remainingValue = Math.max(
				defaultGoal.targetValue - currentValue,
				0,
			);

			// Estimate completion date based on current progress
			let estimatedCompletionDate: string | undefined;
			if (currentValue > 0 && remainingValue > 0) {
				const hoursElapsed = (Date.now() - today.getTime()) / (1000 * 60 * 60);
				const drillsPerHour = currentValue / Math.max(hoursElapsed, 1);
				const hoursRemaining = remainingValue / Math.max(drillsPerHour, 0.1);
				const completionTime = new Date(
					Date.now() + hoursRemaining * 60 * 60 * 1000,
				);
				estimatedCompletionDate = completionTime.toISOString();
			}

			return {
				goal: { ...defaultGoal, currentValue },
				progressPercentage,
				remainingValue,
				estimatedCompletionDate,
			};
		} catch (error) {
			const serialized = serializeError(error);
			console.error(
				"Error getting user progress:",
				JSON.stringify(serialized, null, 2),
			);
			return {
				goal: null,
				progressPercentage: 0,
				remainingValue: 0,
			};
		}
	}

	/**
	 * Get featured content recommendation
	 */
	async getFeaturedContent(user: AuthUser): Promise<{
		title: string;
		description: string;
		difficulty: string;
		link: string;
	} | null> {
		try {
			// Get user's recent evaluations to determine skill level
			const { data: recentEvaluations, error } = await this.supabase
				.from("evaluation_results")
				.select("score")
				.eq("user_id", user.id)
				.not("score", "is", null)
				.order("created_at", { ascending: false })
				.limit(10);

			if (error) {
				const serialized = serializeError(error);
				console.error(
					"Error fetching recent evaluations:",
					JSON.stringify(serialized, null, 2),
				);
			}

			// Calculate average score to determine difficulty
			const averageScore =
				recentEvaluations && recentEvaluations.length > 0
					? recentEvaluations.reduce(
							(sum: number, e: { score: number | null }) =>
								sum + (e.score || 0),
							0,
						) / recentEvaluations.length
					: 0;

			// Determine difficulty and content based on performance
			if (averageScore >= 85) {
				return {
					title: "Advanced System Design",
					description:
						"Master distributed systems, scalability patterns, and architectural decision-making",
					difficulty: "Advanced",
					link: "/drill/advanced-system-design",
				};
			} else if (averageScore >= 70) {
				return {
					title: "React Performance Optimization",
					description:
						"Learn advanced React patterns, memoization, and performance optimization techniques",
					difficulty: "Intermediate",
					link: "/drill/react-performance",
				};
			} else {
				return {
					title: "JavaScript Fundamentals",
					description:
						"Master core JavaScript concepts, closures, prototypes, and async programming",
					difficulty: "Beginner",
					link: "/drill/javascript-fundamentals",
				};
			}
		} catch (error) {
			const serialized = serializeError(error);
			console.error(
				"Error getting featured content:",
				JSON.stringify(serialized, null, 2),
			);
			return null;
		}
	}

	/**
	 * Get study tips based on user performance
	 */
	async getStudyTips(user: AuthUser): Promise<string[]> {
		try {
			// Get user's recent performance data
			const { data: recentEvaluations, error } = await this.supabase
				.from("evaluation_results")
				.select("score, feedback")
				.eq("user_id", user.id)
				.not("score", "is", null)
				.order("created_at", { ascending: false })
				.limit(20);

			if (error) {
				const serialized = serializeError(error);
				console.error(
					"Error fetching recent evaluations:",
					JSON.stringify(serialized, null, 2),
				);
			}

			const tips: string[] = [];

			if (!recentEvaluations || recentEvaluations.length === 0) {
				return [
					"Start with basic concepts and build your foundation gradually.",
					"Practice explaining your code out loud to improve articulation.",
					"Focus on understanding the 'why' behind each solution.",
				];
			}

			// Analyze performance patterns
			const averageScore =
				recentEvaluations.reduce(
					(sum: number, e: { score: number | null }) => sum + (e.score || 0),
					0,
				) / recentEvaluations.length;
			const _lowScores = recentEvaluations.filter(
				(e: { score: number | null }) => (e.score || 0) < 70,
			);
			const _highScores = recentEvaluations.filter(
				(e: { score: number | null }) => (e.score || 0) >= 85,
			);

			// Generate personalized tips
			if (averageScore < 70) {
				tips.push(
					"Focus on fundamental concepts before tackling advanced topics.",
				);
				tips.push("Practice more frequently to build consistency.");
			} else if (averageScore >= 85) {
				tips.push("Great job! Challenge yourself with more complex problems.");
				tips.push("Consider mentoring others to reinforce your knowledge.");
			} else {
				tips.push("You're making good progress! Keep practicing regularly.");
			}

			// Add general tips
			tips.push("Practice explaining your code out loud during interviews.");
			tips.push("Review your mistakes and understand the correct approaches.");
			tips.push("Time yourself to improve your problem-solving speed.");

			return tips.slice(0, 3); // Return top 3 tips
		} catch (error) {
			const serialized = serializeError(error);
			console.error(
				"Error getting study tips:",
				JSON.stringify(serialized, null, 2),
			);
			return [
				"Practice explaining your code out loud. This helps you articulate your thought process during interviews.",
				"Focus on understanding the 'why' behind each solution, not just the 'how'.",
				"Review your mistakes and understand the correct approaches.",
			];
		}
	}
}

export const dashboardService = new DashboardService();
